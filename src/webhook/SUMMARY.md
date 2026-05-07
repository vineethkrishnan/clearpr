# webhook

## Purpose

Receives GitHub webhook deliveries on `POST /webhook`, verifies the HMAC-SHA256 signature against the configured shared secret, deduplicates each delivery by its `X-GitHub-Delivery` ID, classifies the event into a ClearPR action, and dispatches it to the appropriate downstream queue or domain workflow (review, command, installation lifecycle, repository membership). It is the single edge entry point for everything GitHub sends us.

## Ports exposed (interfaces other modules can depend on)

- **`IdempotencyStorePort`** - abstracts at-most-once delivery tracking by GitHub delivery ID.
  Implemented by: `infrastructure/adapters/redis-idempotency-store.adapter.ts` (Redis SET with 24h TTL).

## Ports consumed (dependencies on other modules)

- **`InstallationRepositoryPort` (from `github`)** - look up and persist GitHub App installations on `installation.created/deleted`.
- **`RepositoryRepositoryPort` (from `github`)** - resolve `github_repo_id` to internal repository id, persist new repos on `installation_repositories.added`.
- **`JobProducerService` (from `queue`, concrete dep - candidate for port extraction in P7)** - enqueue review, command, and indexing jobs.
- **`InstallationCleanupService` (from `review`, concrete dep - candidate for port extraction in P7)** - cascade delete on `installation.deleted` and `installation_repositories.removed`.

## Domain entities

None. Webhook is a stateless edge module; persisted state lives in `github`, `review`, `memory`.

## Domain value objects

- `ClearPrAction` - enum of internal action types (`REVIEW_PR`, `PROCESS_COMMAND`, `INSTALLATION_CREATED`, `INSTALLATION_DELETED`, `REPOS_ADDED`, `REPOS_REMOVED`, `UNKNOWN`) plus the `mapWebhookEvent(event, action)` mapper from raw GitHub event names.

## Domain errors

None defined locally. The HMAC guard throws Nest's `UnauthorizedException` directly; downstream errors propagate from consumed modules.

## Use cases / services

- `WebhookDispatcherService` - the single use case: idempotency check, action mapping, and routing to one of six handlers (review, command, installation created/deleted, repos added/removed).

## HTTP surface

- `POST /webhook` - GitHub webhook ingress. Guarded by `HmacSignatureGuard` and the global `ThrottlerGuard` (100 req/min). Returns `{ received: boolean }` with HTTP 200 even on missing-header soft-fails so GitHub does not retry malformed payloads.

## Invariants

- Every accepted delivery is processed at most once (idempotency keyed on `X-GitHub-Delivery`, 24h TTL).
- No request body is parsed by the controller until the HMAC guard has verified `X-Hub-Signature-256` against the raw body using `timingSafeEqual`.
- Payloads missing `event`, `delivery`, or `installation.id` are rejected with `received: false` and never reach the dispatcher.
- The dispatcher writes the idempotency mark before enqueuing downstream work, so a crash between dispatch and enqueue surfaces as a missed delivery (not a duplicate).
- Event types not in the supported map (`pull_request`, `pull_request_review_comment`, `issue_comment`, `installation`, `installation_repositories`) collapse to `UNKNOWN` and are acked without side effects.
