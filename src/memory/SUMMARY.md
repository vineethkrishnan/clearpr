# memory

## Purpose

Builds a per-repository knowledge base of past human review feedback so reviews can be grounded in what reviewers historically cared about. Backfills accepted-vs-dismissed feedback from merged PRs by inspecting whether subsequent commits in the same PR touched the commented file, embeds the comment text plus diff-hunk context with Voyage AI, and stores the vectors in PostgreSQL (pgvector). At review time it embeds the current diff summary and returns the most semantically similar accepted feedback as additional prompt context.

## Ports exposed (interfaces other modules can depend on)

- **`MemoryRepositoryPort`** - persist `PrMemoryEntry` records (single + batch), find similar entries by cosine similarity above a threshold, cascade-delete by repository.
  Implemented by: `infrastructure/repositories/typeorm-memory.repository.ts` (pgvector).
- **`EmbeddingProviderPort`** - embed text or batches of text into vectors.
  Implemented by: `infrastructure/adapters/voyage-embedding.adapter.ts` (Voyage AI `voyage-code-3`).

## Ports consumed (dependencies on other modules)

- **`InstallationRepositoryPort` (from `github`)** - resolve internal installation id to GitHub installation id during indexing.
- **`RepositoryRepositoryPort` (from `github`)** - list installation repos for bulk indexing and update `IndexingStatus` per repo.
- **`GitHubClientService` (from `github`, concrete dep - candidate for port extraction in P7)** - list merged PRs, review comments, and commits used to backfill feedback history.

## Domain entities

- `PrMemoryEntry` - a single past review comment with its code context, author, detected outcome, and embedding vector. Scoped to a repository.

## Domain value objects

- `FeedbackOutcome` - `ACCEPTED` (a later commit in the PR touched the commented file) or `DISMISSED` (no follow-up edit).

## Domain errors

- `EmbeddingApiError` - the embedding provider call failed (transient, retryable). Note: `MemoryRetrieverService` swallows retrieval failures and proceeds with `null` context, so reviews never block on embedding outages.

## Use cases / services

- `RepositoryIndexerService` - bulk-indexes an installation's repositories and incrementally indexes a single repository; advances `Repository.indexingStatus` (`PENDING` -> `IN_PROGRESS` -> `COMPLETED|FAILED`).
- `MemoryIndexerService` - given a list of indexable comments, batch-embeds and persists them.
- `MemoryRetrieverService` - given a diff summary, embeds it and returns the top-N accepted similar entries formatted for prompt inclusion. Returns `null` on no matches or any failure.
- `OutcomeDetectorService` - pure function: classifies a comment as accepted or dismissed by checking whether any subsequent commit in the same PR changed the commented file.

## HTTP surface

None - internal module. Indexing is triggered by `IndexingConsumer` reading from the indexing queue; retrieval is called inline by `ReviewOrchestratorService`.

## Invariants

- Embeddings are stored as a fixed-dimension vector per entry (provider-defined); cosine-similarity threshold is the configured `SIMILARITY_THRESHOLD`.
- Only entries with `outcome === ACCEPTED` are surfaced to the reviewer LLM; dismissed feedback is stored for analytics but excluded from prompt context.
- `findSimilar` is always scoped by `repositoryId`; cross-repository memory leakage is impossible at the port level.
- Outcome detection is deterministic from `(commentCreatedAt, filePath, subsequentCommits)` - no network calls, no clock dependence beyond the inputs.
- Retrieval failures degrade gracefully: a review proceeds with `null` memory context rather than failing.
