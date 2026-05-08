# github

## Purpose

The single integration boundary with the GitHub REST API. Owns persistence for GitHub-side identities (installations and repositories), mints and caches short-lived installation access tokens via the GitHub App's private key, exposes a thin Octokit-backed client for the calls used elsewhere (PR metadata, PR files, file content at a ref, listing merged PRs and their review comments and commits, posting reviews and issue comments), and tracks rate-limit headroom so we fail fast before being throttled.

## Ports exposed (interfaces other modules can depend on)

- **`InstallationRepositoryPort`** - persist and look up `Installation` aggregates by internal id or `githubInstallationId`.
  Implemented by: `infrastructure/repositories/typeorm-installation.repository.ts`.
- **`RepositoryRepositoryPort`** - persist `Repository` aggregates and look them up by id, GitHub repo id, or installation; cascade-delete by installation or single GitHub repo id.
  Implemented by: `infrastructure/repositories/typeorm-repository.repository.ts`.

## Ports consumed (dependencies on other modules)

None. `github` is a leaf integration module - it depends only on `config` (for `GITHUB_APP_ID` and `GITHUB_PRIVATE_KEY`) and `shared/redis` (for token caching).

`InstallationTokenService`, `RateLimiterService`, and `GitHubClientService` are exported as concrete classes today (candidates for port extraction in P7 so consumers like `webhook`, `review`, `memory`, `diff-engine` depend on abstractions).

## Domain entities

- `Installation` - a GitHub App installation identified by `githubInstallationId`, with account login and `Organization`/`User` type. Owns its lifecycle status; supports `markInactive()` for soft-removal on `installation.deleted`.
- `Repository` - a GitHub repository tied to an installation, identified by `githubRepoId` and `fullName`. Holds free-form `settings` and an `IndexingStatus` (`PENDING` -> `IN_PROGRESS` -> `COMPLETED|FAILED`) advanced by the memory indexer.

## Domain value objects

- `InstallationStatus` - `ACTIVE` or `INACTIVE`, constructed via `InstallationStatus.active()` / `inactive()`.

## Domain errors

- `GitHubApiError` - any non-2xx response from the GitHub API; `isTransient` is true for status >= 500.
- `GitHubRateLimitError` - thrown by `RateLimiterService.checkBeforeRequest()` when remaining budget is below 10 and the reset time is in the future.

## Use cases / services

- `InstallationTokenService` - mints installation access tokens via Octokit `App`, caches them in Redis under `token:<installationId>` with TTL = expiry minus 10-minute safety margin.
- `RateLimiterService` - in-memory per-process rate-limit state updated from `x-ratelimit-*` response headers; pre-flight check throws `GitHubRateLimitError` to abort before hitting GitHub.
- `GitHubClientService` - all GitHub REST calls used by the rest of the system, wrapping each in `getOctokit -> updateRateLimit -> wrapError`.

## HTTP surface

None - internal module. All GitHub I/O is outbound; inbound webhooks land in `webhook`.

## Invariants

- `Installation.githubInstallationId` and `Repository.githubRepoId` are the external-id boundary; everything else in the system references the internal UUID `id`.
- A `Repository` always has a non-null `installationId` - cascading delete on installation removal is enforced via `deleteByInstallationId`.
- Installation tokens are never persisted to durable storage, only Redis with a TTL strictly less than GitHub's expiry.
- Rate-limit headroom is mutated after every Octokit call by reading `x-ratelimit-remaining` / `x-ratelimit-reset` headers; the limiter is a per-process singleton (no cross-instance coordination today).
- Every public `GitHubClientService` method funnels failures through `wrapError` so callers see only `GitHubApiError`/`GitHubRateLimitError`, not raw Octokit errors.
