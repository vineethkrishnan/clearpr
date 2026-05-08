# Architecture Overview

ClearPR is a NestJS application built around **Hexagonal Architecture** (also known as Ports and Adapters) with **Domain-Driven Design** boundaries between modules. The goal is simple: keep the parts that decide *what to do* (domain) separate from the parts that decide *how to talk to the outside world* (infrastructure), so we can swap out an LLM provider, a database driver, or a queue backend without touching the business rules.

## High-level flow

```
       GitHub PR webhook
              │
              ▼
       ┌──────────────┐
       │  HMAC guard  │   Verify signature, dedupe by delivery ID
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │  Dispatcher  │   Map GitHub event → ClearPR action
       └──────┬───────┘
              │  enqueue (30s debounce)
              ▼
       ┌──────────────┐
       │ BullMQ queue │   Redis-backed
       └──────┬───────┘
              │
              ▼
       ┌──────────────────────────────────────┐
       │         Review Orchestrator          │
       └──┬──────────────┬───────────────┬────┘
          │              │               │
          ▼              ▼               ▼
   ┌─────────────┐ ┌────────────┐ ┌─────────────┐
   │ Diff Engine │ │ PR Memory  │ │ LLM Provider│
   │   (AST)     │ │ (pgvector) │ │  (port)     │
   └─────────────┘ └────────────┘ └─────────────┘
          │              │               │
          └──────────────┴───────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Review Poster  │   Inline + summary comments
                └─────────────────┘
                         │
                         ▼
                  GitHub PR
```

The webhook controller does only signature verification and delivery dedup. Everything else happens off the request path, in a BullMQ worker, so GitHub gets its 200 inside its 10-second window even when the LLM takes a while.

## Hexagonal layout

Every module is shaped the same way:

```
src/<module>/
├── domain/
│   ├── entities/         Pure TS classes, no decorators
│   ├── value-objects/    Immutable, equality-by-value
│   ├── ports/            Abstract classes (interfaces) for outside collaborators
│   └── errors/           Domain-specific error types
├── application/
│   └── services/         Use cases / orchestration
├── infrastructure/
│   ├── adapters/         Concrete implementations of ports
│   └── repositories/     TypeORM schemas + mappers
└── presentation/         (only modules that have an HTTP surface)
    └── *.controller.ts
```

The arrows always point inward. `application` may depend on `domain`. `infrastructure` may depend on `domain` (to implement a port). Nothing in `domain` ever imports from `application` or `infrastructure`.

### Concrete example: PR memory

The memory module persists past review comments with embeddings and finds similar ones at review time. Its hexagonal slices look like this:

```
memory/
├── domain/
│   ├── entities/pr-memory-entry.entity.ts        ← plain class
│   └── ports/memory-repository.port.ts           ← abstract class
├── application/
│   └── services/memory-retriever.service.ts      ← uses the port
└── infrastructure/
    └── repositories/typeorm-memory.repository.ts ← implements the port
```

`MemoryRepositoryPort` is an abstract class in the domain layer:

```ts
export abstract class MemoryRepositoryPort {
  abstract save(entry: PrMemoryEntry): Promise<void>;
  abstract findSimilar(
    repositoryId: string,
    embedding: number[],
    limit: number,
    threshold: number,
  ): Promise<SimilarMemoryResult[]>;
  // ...
}
```

`TypeOrmMemoryRepository` lives in `infrastructure/` and `extends MemoryRepositoryPort`. It knows about `pgvector`, raw SQL, and TypeORM `Repository<T>`. The domain layer knows none of that.

The use case in `application/services/memory-retriever.service.ts` only ever sees `MemoryRepositoryPort` injected by Nest. Same for `EmbeddingProviderPort`. Swap pgvector for FAISS, swap OpenAI embeddings for a local model, and the use case is untouched.

## Why hexagonal here

This shape is overkill for a 200-line script. ClearPR has earned it because:

- **Multiple LLM providers, one orchestrator.** Anthropic, OpenAI, Ollama, Mistral, and Gemini all sit behind `LlmProviderPort`. The review pipeline never imports a vendor SDK.
- **Swappable storage.** TypeORM today, but the domain doesn't know that. If we move from PostgreSQL + pgvector to a dedicated vector store, only `infrastructure/` changes.
- **Swappable queue.** BullMQ today. Tomorrow, SQS or Temporal. The producer/consumer interfaces are thin enough to retarget.
- **Tests stay fast.** Use cases get fakes for ports; nothing spins up Redis, Postgres, or a real LLM in unit tests.
- **The webhook can't pollute the domain.** GitHub's payload shape is an infrastructure concern. A change in their API surface should never ripple into the review domain.

## Module list

| Module | Responsibility | Where to look |
|---|---|---|
| **Webhook** | Receive GitHub events, validate HMAC, dedupe by `X-GitHub-Delivery`, dispatch to actions | `src/webhook/` |
| **Queue** | BullMQ producers and thin consumer shells; one job per ClearPR action | `src/queue/` |
| **Review** | Orchestrate the pipeline: load guidelines, fetch memory, build prompt, call LLM, post comments | `src/review/` |
| **Diff Engine** | Parse files, normalize ASTs per language, return semantic diff | `src/diff-engine/` |
| **Memory** | Index past PR feedback, embed it, find similar past comments at review time | `src/memory/` |
| **GitHub** | Shared kernel: API client, App auth, installation tokens, repo metadata | `src/github/` |
| **Health** | Liveness and readiness endpoints for orchestrators | `src/health/` |

Each module owns its slice end-to-end. Cross-module imports go through ports, not concrete classes. The closest thing to a shared kernel is the `github/` module, used by everything that needs to call the GitHub API.

## Data flow

1. GitHub `POST /webhook`
2. `HmacGuard` validates `X-Hub-Signature-256`
3. Delivery ID looked up in Redis; duplicates dropped
4. Dispatcher maps event type to an action (e.g. `pull_request.opened` → `ReviewPrAction`)
5. Producer enqueues with a 30s debounce key (e.g. `review:owner/repo#42`) so a flurry of pushes collapses to one review
6. Consumer pops the job, calls `ReviewOrchestratorService.run(...)`
7. Orchestrator runs the pipeline:
   1. Diff Engine returns a semantic diff
   2. Guideline Loader reads `claude.md` / `agent.md` / `.reviewconfig`
   3. Memory Retriever finds accepted past feedback similar to the diff
   4. Prompt Builder assembles the final prompt with a token budget
   5. LLM Provider generates the review
   6. Review Poster writes inline + summary comments back to GitHub

## Key patterns

- **Ports and Adapters** for everything external (GitHub, LLMs, embeddings, vector store, queue, file content)
- **Strategy Pattern** for normalizers: a registry maps language → AST normalizer
- **Provider Registry** for LLMs: `LLM_PROVIDER` env var picks the adapter at startup
- **Result Type** in selected use cases: `Result<T, E>` instead of throwing for expected failures
- **Correlation IDs**: `X-GitHub-Delivery` is propagated through `nestjs-cls` AsyncLocalStorage so every log line tied to a webhook is traceable end-to-end

## Where to go next

- [Domain Model](./domain-model.md) — entities, value objects, and what lives in each module
- [Contributing Conventions](./contributing-conventions.md) — the rules each layer plays by
- [Dev Workflow](./dev-workflow.md) — how to add a module or an LLM provider, day-to-day
