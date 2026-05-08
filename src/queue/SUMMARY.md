# queue

## Purpose

Async work coordination on top of BullMQ + Redis. Defines three named queues - `reviews`, `commands`, `indexing` - their retry/backoff policies, and the typed payloads each one carries. Producers debounce duplicate review jobs for the same PR (so a flurry of pushes collapses to one review against the latest SHA) and prioritize manual triggers; consumers fan out to the appropriate domain service in `review` and `memory` and re-throw transient errors so BullMQ's retry machinery does its job.

## Ports exposed (interfaces other modules can depend on)

None as abstract classes today. `JobProducerService` is exported and consumed directly by `webhook` (concrete dep - candidate for port extraction in P7, e.g. `JobEnqueuerPort` so `webhook` depends on an abstraction rather than the BullMQ-bound producer).

## Ports consumed (dependencies on other modules)

- **`ReviewOrchestratorService` (from `review`, concrete dep - candidate for port extraction in P7)** - executed by `ReviewConsumer` per dequeued review job.
- **`CommandHandlerService` (from `review`, concrete dep - candidate for port extraction in P7)** - executed by `CommandConsumer` per dequeued `@clearpr` command job.
- **`RepositoryIndexerService` (from `memory`, concrete dep - candidate for port extraction in P7)** - executed by `IndexingConsumer` for both bulk (per installation) and incremental (per repository) jobs.
- **`RepositoryRepositoryPort` (from `github`)** - used by `IndexingConsumer` to resolve `repositoryId` to a `Repository` for incremental indexing.

## Domain entities

None. Queue is purely a transport/coordination module.

## Domain value objects

- `QUEUE_NAMES` - the canonical set of queue names (`reviews`, `commands`, `indexing`) used everywhere a name is referenced.
- `ReviewJobPayload`, `CommandJobPayload`, `IndexingJobPayload` (interfaces, not classes) - each extends `BaseJobPayload` (`correlationId`, `installationId`, `repositoryId`, `repoFullName`).

## Domain errors

None defined locally. Consumers re-throw whatever the domain services throw; BullMQ classifies failures by `attemptsMade` against `attempts`.

## Use cases / services

- `JobProducerService` - the single producer. `enqueueReview` debounces against `debounce:<repositoryId>:<prNumber>` (Redis key, TTL = `DEBOUNCE_WINDOW_MS`) and updates the in-flight job's SHA if it is still in `waiting`; manual reviews jump the queue with priority 1 vs auto's 10. `enqueueCommand` and `enqueueIndexing` are straightforward `add` calls.
- `ReviewConsumer` - concurrency 3, builds `ReviewContext` and hands off to the orchestrator. Transient `DomainError`s are re-thrown for retry; permanent errors are logged but not retried (the orchestrator has already updated state and posted a comment).
- `CommandConsumer` - concurrency 5, dispatches to `CommandHandlerService.handle`.
- `IndexingConsumer` - concurrency 2, branches on `payload.type` between `indexInstallation` (bulk) and `indexRepository` (incremental).

## HTTP surface

None - internal module.

## Invariants

- Per-PR review debouncing: while a review job for `(repositoryId, prNumber)` is in `waiting`, additional pushes update the existing job's `prSha` instead of creating a new one. Jobs already `active` are not coalesced.
- Manual `@clearpr review` jobs always outrun auto-triggered jobs in the same queue (priority 1 vs 10).
- All three queues retry up to 3 times with exponential backoff (`reviews`: 30s, `commands`: 10s, `indexing`: 60s); failed jobs are kept (`removeOnFail: false`) so they show up in DLQ inspection / health checks.
- Consumers re-throw to BullMQ only on transient errors; permanent failures are logged-and-acked so the same broken payload does not burn all 3 attempts.
- All payloads carry a `correlationId` (the GitHub delivery id when sourced from the webhook) propagated end-to-end in logs.
