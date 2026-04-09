# Architecture Overview

ClearPR follows **Domain-Driven Design** with **Hexagonal Architecture** (Ports & Adapters).

## Bounded Contexts

| Module | Responsibility | Owns |
|---|---|---|
| **Webhook** | Receive, validate, dispatch GitHub events | Delivery tracking |
| **Diff Engine** | Compute semantic diffs via AST parsing | No state (pure computation) |
| **Review** | Orchestrate AI review pipeline | Reviews, comments |
| **Memory** | Index and retrieve past PR feedback | Embeddings |
| **GitHub** | Shared kernel — API client, tokens, installations | Installations, repos |

## Data Flow

```
1. GitHub sends webhook → POST /webhook
2. HMAC guard validates signature
3. Idempotency store deduplicates
4. Dispatcher maps event → ClearPR action
5. Job producer enqueues (with 30s debounce)
6. Review consumer picks up job
7. Orchestrator runs pipeline:
   a. Diff Engine computes semantic diff
   b. Guideline Loader fetches project rules
   c. Memory Retriever finds relevant past feedback
   d. Prompt Builder assembles the prompt
   e. LLM Provider generates review
   f. Review Poster posts to GitHub
```

## Module Dependencies

```
Webhook → Queue (enqueue jobs)
Queue → Review (thin consumer shell)
Review → Diff Engine (compute diff)
Review → Memory (retrieve context)
Review → LLM Provider (via port)
Review → Review Poster (via port)
Diff Engine → File Content Provider (via port)
Memory → Embedding Provider (via port)
```

## Domain Boundary Rules

- Domain layers never import from infrastructure
- No cross-module domain imports
- All external access goes through **ports** (abstract classes)
- Infrastructure **adapters** implement ports
- Queue consumers are thin shells — one call to orchestrator

## Key Patterns

- **Ports & Adapters**: Every external dependency (GitHub, Claude, tree-sitter, pgvector) is behind an abstract port
- **Strategy Pattern**: Normalizer registry dispatches to per-language normalizers
- **Provider Registry**: LLM provider selected at startup via env var
- **Result Type**: Application services return `Result<T, E>` instead of throwing
- **Correlation IDs**: `X-GitHub-Delivery` propagated through AsyncLocalStorage to every log line
