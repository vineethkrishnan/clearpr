# Domain Model

## Entities

### Installation
Represents a GitHub App installation (one org or user account).

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Internal ID |
| `githubInstallationId` | number | GitHub's installation ID |
| `accountLogin` | string | GitHub org/user login |
| `accountType` | `Organization` or `User` | Account type |
| `status` | InstallationStatus | `active` or `inactive` |

### Repository
A repository tracked by ClearPR under an installation.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Internal ID |
| `installationId` | UUID | FK to Installation |
| `githubRepoId` | number | GitHub's repo ID |
| `fullName` | string | `owner/repo` format |
| `settings` | JSON | Per-repo config overrides |
| `indexingStatus` | enum | `pending`, `in_progress`, `completed`, `failed` |

### Review
A single review execution for a PR.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Internal ID |
| `repositoryId` | UUID | FK to Repository |
| `prNumber` | number | PR number |
| `prSha` | string | Head commit SHA at review time |
| `trigger` | enum | `auto`, `manual`, `rerun` |
| `status` | enum | `queued`, `processing`, `completed`, `failed`, `skipped` |
| `rawDiffLines` | number | Total raw diff lines |
| `semanticDiffLines` | number | Lines after filtering |
| `noiseReductionPct` | number | Percentage of noise removed |
| `modelUsed` | string | LLM model ID |

### PrMemoryEntry
A stored review comment with its vector embedding.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Internal ID |
| `repositoryId` | UUID | FK to Repository |
| `prNumber` | number | Source PR |
| `commentText` | string | The review comment |
| `codeContext` | string | Surrounding diff hunk |
| `outcome` | enum | `accepted` or `dismissed` |
| `embedding` | vector(512) | For similarity search |

## Value Objects

| Name | Module | Purpose |
|---|---|---|
| `Language` | Diff Engine | File language detection |
| `DiffHunk` | Diff Engine | One contiguous block of changes |
| `Severity` | Review | `critical`, `warning`, `info` |
| `ReviewStatus` | Review | State machine for review lifecycle |
| `ReviewTrigger` | Review | `auto`, `manual`, `rerun` |
| `TokenBudget` | Review | Token allocation per prompt section |
| `FeedbackOutcome` | Memory | Whether feedback was acted on |
| `InstallationStatus` | GitHub | Active/inactive state |
| `WebhookEventType` | Webhook | GitHub event discriminator |

## Domain Errors

Errors thrown by use cases or domain logic. All extend `DomainError` (which carries a `code` and an `isTransient` flag — transient errors trigger BullMQ retry; permanent errors do not).

| Error | Module | Code | Transient? | When |
|---|---|---|:-:|---|
| `GitHubApiError` | GitHub | `GITHUB_API_FAILED` | varies (set by status code) | Any non-2xx GitHub response |
| `GitHubRateLimitError` | GitHub | `GITHUB_RATE_LIMITED` | yes | 429 / `x-ratelimit-remaining: 0` |
| `LlmTimeoutError` | Review | `LLM_TIMEOUT` | yes | LLM request hits its deadline |
| `LlmRateLimitError` | Review | `LLM_RATE_LIMITED` | yes | LLM provider 429 |
| `MalformedLlmResponseError` | Review | `LLM_RESPONSE_MALFORMED` | yes | LLM JSON didn't parse or fields missing |
| `UnknownLlmProviderError` | Review | `LLM_PROVIDER_UNKNOWN` | no | Config has an unsupported `LLM_PROVIDER` value |
| `ReviewSkippedError` | Review | `REVIEW_SKIPPED` | no | Review intentionally not run (e.g. diff too large) |
| `DiffTooLargeError` | Diff Engine | `DIFF_TOO_LARGE` | no | Semantic diff exceeds `MAX_DIFF_LINES`; orchestrator translates to `ReviewSkippedError` |
| `EmbeddingApiError` | Memory | `EMBEDDING_API_FAILED` | yes | Voyage / embedding provider failure |
| `InstallationNotFoundError` | Memory | `INSTALLATION_NOT_FOUND` | no | Indexer asked to run for an installation that's gone |
| `InvalidRepositoryFullNameError` | Memory | `INVALID_REPOSITORY_FULL_NAME` | no | Repository's `fullName` is not `owner/repo` |

## Ports (per module)

Abstract classes used as DI tokens. Cross-module ports live in `application/ports/`; in-module collaborator ports live in `domain/ports/`.

### Diff Engine
- `AstNormalizerPort` (domain) — language-aware AST normalization
- `FileContentProviderPort` (domain) — fetch file blobs at a given ref

### Review
- `LlmProviderPort` (domain) — generate review against a prompt
- `ReviewRepositoryPort` (domain) — persist Review entities
- `ReviewPosterPort` (domain) — post inline + summary comments
- `PrFileListProviderPort` (domain) — fetch PR file list
- `DiffComputerPort` (application) — cross-module port to the diff engine
- `MemoryRetrieverPort` (application) — cross-module port to memory

### Memory
- `EmbeddingProviderPort` (domain) — text → vector
- `MemoryRepositoryPort` (domain) — persist + similarity search
- `PrHistoryProviderPort` (application) — cross-module port to GitHub PR history

### GitHub
- `InstallationRepositoryPort` (domain) — persist installations
- `RepositoryRepositoryPort` (domain) — persist tracked repos

### Webhook
- `IdempotencyStorePort` (domain) — delivery-ID dedup store
- `JobEnqueuerPort` (application) — cross-module port to the queue
- `InstallationCleanupPort` (application) — cross-module port to review cleanup

### Queue
- `ReviewExecutorPort` (application) — cross-module port to `OrchestrateReviewUseCase`
- `CommandHandlerPort` (application) — cross-module port to `HandleCommandUseCase`
- `RepositoryIndexerPort` (application) — cross-module port to `IndexRepositoryUseCase`
