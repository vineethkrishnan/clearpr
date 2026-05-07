# Contributing Conventions

These are the rules every module in `src/` is expected to follow. They exist so that anyone can drop into any module and find the same shape, the same import directions, and the same tradeoffs already made.

If you're new here, also read [Architecture Overview](./architecture.md) first.

## Module structure

Every module under `src/<module>/` uses the same hexagonal layout:

```
src/<module>/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── ports/
│   └── errors/
├── application/
│   └── services/        (use cases)
├── infrastructure/
│   ├── adapters/
│   └── repositories/
├── presentation/        (HTTP-facing modules only)
│   └── *.controller.ts
└── <module>.module.ts
```

Allowed contents per layer:

| Layer | What lives here | What does NOT live here |
|---|---|---|
| `domain/` | Entities, value objects, ports (abstract classes), domain errors | NestJS decorators, ORM types, HTTP types, vendor SDKs |
| `application/` | Use cases (one per business operation), DTOs with `class-validator`, application-level errors | TypeORM entities, raw SQL, vendor clients |
| `infrastructure/` | Adapters that implement domain ports, TypeORM schemas, mappers, vendor SDK calls | Business rules, branching on domain logic |
| `presentation/` | Controllers, request DTOs, guards specific to HTTP | Use case logic |

## Domain layer rules

The domain is the part of the codebase that should still make sense if you tore out NestJS, TypeORM, BullMQ, and every vendor SDK.

- **Entities are pure TypeScript classes.** No `@Entity()`, no `@Column()`, no Nest `@Injectable()`. See `src/memory/domain/entities/pr-memory-entry.entity.ts` as the canonical example.
- **Value objects are immutable** and compared by value, not by reference. Examples: `Severity`, `TokenBudget`, `DeliveryId`.
- **Ports are abstract classes**, not TypeScript `interface` declarations. Nest's DI container can't inject by interface, so we use `abstract class` and bind in the module's `providers` list.
- **Domain errors extend a base domain error**, not `HttpException`. HTTP status codes are a presentation-layer concern. If a use case throws `LlmRateLimitError`, the controller (or a global filter) decides what HTTP status that becomes.
- **No imports from `application/` or `infrastructure/`.** If you find yourself wanting to reach out, you've found a port that needs to exist.

Example port (from `src/review/domain/ports/llm-provider.port.ts`):

```ts
export abstract class LlmProviderPort {
  abstract generateReview(prompt: string, maxTokens: number): Promise<LlmResponse>;
}
```

That's the entire contract. Five different vendor adapters implement it.

## Application layer rules

- **One use case per business operation.** Don't pile unrelated methods onto one service. `MemoryRetrieverService.findRelevant()` is its own thing; indexing lives in `MemoryIndexerService`.
- **Inject ports, not concretes.** A use case constructor takes `MemoryRepositoryPort`, never `TypeOrmMemoryRepository`. The Nest module wires the binding.
- **DTOs use `class-validator`.** Anything coming in from the outside (HTTP body, queue payload, env config) gets validated at the boundary.
- **Use cases return plain values or `Result<T, E>`** for expected failures. Throw only for genuinely exceptional conditions.
- **Logging happens here**, not in the domain. Use the Nest `Logger` with the service class name as context.

## Infrastructure layer rules

- **TypeORM records are separate from domain entities.** A `PrMemoryRow` (snake_case columns, vector serialization, `created_at` defaults) is not a `PrMemoryEntry`. Repositories convert between them via private `toRow` / `toDomain` mappers.
- **Adapters implement exactly one port.** Don't extend a port and add public methods that aren't on the port. Other modules consume the port; new methods on the adapter are invisible to them by design.
- **Vendor SDK quirks are translated at the boundary.** Anthropic's `APIError.status === 429` becomes a domain `LlmRateLimitError` inside the adapter. Higher layers never see a vendor error type.
- **Adapters are dumb pipes.** They don't decide *whether* to call the vendor; they just call it and translate the result.

Example adapter (excerpt from `src/review/infrastructure/llm/anthropic-llm.adapter.ts`):

```ts
export class AnthropicLlmAdapter extends LlmProviderPort {
  // ...
  async generateReview(prompt: string, maxTokens: number): Promise<LlmResponse> {
    try {
      const response = await this.client.messages.create({ /* ... */ });
      return { content, promptTokens, completionTokens, model };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) throw new LlmRateLimitError(...);
        if (error.status === 408 || error.status === 504) throw new LlmTimeoutError();
      }
      throw error;
    }
  }
}
```

The port returns a domain `LlmResponse`. The vendor type never escapes.

## Quality thresholds

These are enforced in CI; PRs that drop below the bar get bounced.

- **Cognitive complexity <= 15** per function (sonarjs rule). If a function is too complex, extract a helper or split the use case.
- **No `any`.** Use `unknown` and narrow, or define the type. The lint rule is `@typescript-eslint/no-explicit-any: 'error'`.
- **No floating promises.** `@typescript-eslint/no-floating-promises` is on; await everything or explicitly mark fire-and-forget with `void`.
- **Use `Logger` from `@nestjs/common`**, never `console.*`. Pino is wired underneath via `nestjs-pino`.
- **Booleans are named `is*`, `has*`, `can*`, `should*`.** `isCompleted`, not `completed`. `hasGuidelines`, not `guidelines`.
- **Intent-revealing names.** No `acc`, `obj`, `val`, `tmp`, `res`, `data`. `featureAccess`, `userGroup`, `installationId` instead.
- **Early returns over nested `if/else`.** Bail out at the top, keep the happy path flat.
- **File size soft limit.** If a file is past ~300 lines, it's probably doing two jobs. Split.

## Testing

- **Red-green-refactor.** Write the failing test first, the smallest implementation to pass it, then clean up.
- **Test behavior, not implementation.** A test that breaks when you rename a private method is testing the wrong thing.
- **Use realistic test data.** Real-shaped GitHub payloads, real diffs, real prompts. Fixtures live next to the test that uses them.
- **Don't test library plumbing.** A use case that just delegates to a port and returns the result is mostly testing the mock framework. Test cases with branching, mapping, or transformation.
- **Use cases get fakes for ports.** No live Postgres, Redis, or LLM calls in unit tests.

## Commit format

ClearPR uses Conventional Commits with a ticket ID requirement. PR titles are validated automatically.

```
<type>(<scope>): <subject> (LU-xxx)

<body>
```

- **Type**: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `build`, `ci`
- **Scope**: lowercase with hyphens (`diff-engine`, `webhook`, `memory`)
- **Subject**: lowercase, imperative, under 72 chars, no trailing period
- **Ticket**: `LU-` (or `AYL-` / `LOC-`) followed by digits, in parentheses at end of subject
- **Body**: blank line after subject, explain *why*. Don't hard-wrap; let editors soft-wrap.

Always commit with a HEREDOC so the body formats correctly:

```bash
git commit -m "$(cat <<'EOF'
feat(memory): add cosine similarity threshold to retriever (LU-42)

Replaces the hard-coded 0.7 threshold with config-driven
SIMILARITY_THRESHOLD so per-environment tuning is possible
without a redeploy.
EOF
)"
```

For the full ruleset (types, scopes, ticket pattern), see the project's `CLAUDE.md` and the existing `CONTRIBUTING.md`. PRs that fail the title check will be flagged in CI before review.
