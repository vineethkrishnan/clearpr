# review

## Purpose

Owns the end-to-end PR review workflow: fetch the PR file list, compute a semantic diff, load repo guidelines, retrieve relevant past feedback from memory, build a sanitized prompt, call the configured LLM provider, parse the response into structured comments, and post inline comments plus a summary back to GitHub. Also handles the `@clearpr` slash commands (`review`, `diff`, `ignore`, `config`) and the cascade-delete invoked by webhook on installation/repository removal.

## Ports exposed (interfaces other modules can depend on)

- **`ReviewRepositoryPort`** - persist `Review` aggregates and look them up by PR + SHA; bulk delete by repository.
  Implemented by: `infrastructure/repositories/typeorm-review.repository.ts`.
- **`ReviewPosterPort`** - post inline review comments and the summary body to a GitHub PR.
  Implemented by: `infrastructure/adapters/github-review-poster.adapter.ts`.
- **`PrFileListProviderPort`** - list the files changed in a PR (status, additions, deletions, previous filename).
  Implemented by: `infrastructure/adapters/github-pr-file-list.adapter.ts`.
- **`LlmProviderPort`** - generate a JSON review from a built prompt.
  Implemented by: one of `anthropic-llm.adapter.ts`, `openai-llm.adapter.ts`, `gemini-llm.adapter.ts`, `mistral-llm.adapter.ts`, `ollama-llm.adapter.ts` selected at boot by `llm-provider.registry.ts` based on `AppConfig.LLM_PROVIDER`.

## Ports consumed (dependencies on other modules)

- **`SemanticDiffService` (from `diff-engine`, concrete dep - candidate for port extraction in P7)** - compute the noise-filtered semantic diff used as the LLM input.
- **`FileContentProviderPort` (from `diff-engine`)** - used by `GuidelineLoaderService` to read `claude.md` / `agent.md` / `.reviewconfig` from the base branch.
- **`MemoryRetrieverService` (from `memory`, concrete dep - candidate for port extraction in P7)** - fetch accepted past feedback similar to the current diff for prompt grounding.
- **`MemoryRepositoryPort` (from `memory`)** - cascade-delete memory entries during installation/repository cleanup.
- **`InstallationRepositoryPort`, `RepositoryRepositoryPort` (from `github`)** - look up the installation and repositories during cleanup.
- **`GitHubClientService` (from `github`, concrete dep - candidate for port extraction in P7)** - used by `CommandHandlerService` to read PR metadata and post issue comments for `@clearpr` acks and `diff`/`config` output.

## Domain entities

- `Review` - aggregate root for a single review attempt against a `(repositoryId, prNumber, prSha)`. Tracks status, diff stats, model used, token counts, duration, error message, and child comments.
- `ReviewComment` - a single inline finding (file path, line, side, severity, body) belonging to a `Review`.

## Domain value objects

- `Severity` - `CRITICAL` / `WARNING` / `INFO`, with `meetsThreshold` ordering.
- `ReviewStatus` - `QUEUED` / `PROCESSING` / `COMPLETED` / `FAILED` / `SKIPPED`.
- `ReviewTrigger` - `AUTO` (PR open/sync/reopen) or `MANUAL` (`@clearpr review`).
- `TokenBudget` - allocation strategy splitting the LLM context window across system / guidelines / memory / diff / response.

## Domain errors

- `LlmTimeoutError` - LLM call exceeded its deadline (transient, retryable).
- `LlmRateLimitError` - LLM provider rate-limited the request (transient, carries `retryAfter`).
- `MalformedLlmResponseError` - response could not be parsed as the expected JSON shape (transient).
- `ReviewSkippedError` - review intentionally skipped (e.g. semantic diff exceeds `MAX_DIFF_LINES`); not retryable.

## Use cases / services

- `ReviewOrchestratorService` - the main review pipeline (will become `execute-review.use-case.ts` in P3).
- `CommandHandlerService` - dispatches `@clearpr review|diff|ignore|config` commands.
- `GuidelineLoaderService` - reads project guideline files from the base branch.
- `PromptBuilderService` - assembles the LLM prompt from diff, guidelines, memory context with budget-based truncation.
- `PromptSanitizer` - strips prompt-injection patterns from user-controlled fields (PR title/body).
- `IgnoreListService` - per-PR file ignore globs persisted in Redis (TTL 30d, capped at 50 patterns).
- `InstallationCleanupService` - cascade-delete memory + reviews + repositories on installation or repo removal.

## HTTP surface

None - internal module. All side-effects flow through queue consumers (`ReviewConsumer`, `CommandConsumer`) calling into these services. GitHub I/O is via the injected ports.

## Invariants

- A `Review` is created and persisted with status `PROCESSING` before any LLM or GitHub calls; every terminal path (`COMPLETED`, `FAILED`, `SKIPPED`) writes back through `ReviewRepositoryPort`.
- All review comments reference a `Review.id` (FK enforced via `reviewId` on `ReviewComment`).
- LLM input never includes raw user-supplied PR title/body without passing through `PromptSanitizer`.
- Reviews exceeding `MAX_DIFF_LINES` semantic lines are short-circuited with `ReviewSkippedError`, posting a user-visible skip summary instead of calling the LLM.
- Per-PR ignore globs are applied before semantic diff computation, so ignored files never enter the prompt or token budget.
- Cleanup is idempotent: deleting an unknown installation/repository returns 0/null without error.
