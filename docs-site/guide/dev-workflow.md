# Dev Workflow

This page is the practical, day-to-day version of [Contributing Conventions](./contributing-conventions.md). It covers setup, the validation loop you run before pushing, and two recipes that come up often: adding a new module, and adding a new LLM provider.

## Setup

```bash
git clone https://github.com/vineethkrishnan/clearpr.git
cd clearpr
npm install
cp .env.example .env       # fill in GitHub App credentials, LLM key
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL + Redis
npm run migration:run
npm run start:dev
```

`docker-compose.dev.yml` only brings up the stateful dependencies (`pgvector/pgvector:pg16` and `redis:7-alpine`). The Nest app runs on the host so you get watch reloads without a container rebuild on every save.

## The validation loop

Before you push, run the same four steps CI runs. They're fast and they catch nearly everything review would have caught.

```bash
npm run lint:check     # ESLint (no fix)
npm run test           # Jest
npm run build          # nest build (catches type errors the editor missed)
```

You can also run:

- `npm run lint:dead-code` — `tsc --noEmit --noUnusedLocals --noUnusedParameters`
- `npm run lint:strict` — strict-mode TypeScript pass
- `npm run lint:duplicates` — `jscpd` looking for copy-paste
- `npm run test:cov` — Jest with coverage report
- `npm run format` — Prettier write (use `format:check` to dry-run)

If you only want to trigger a single layer, run them in this order: types -> lint -> tests -> build. A failing `tsc` makes everything else noisy.

## Adding a new module

Suppose we want a `notifications/` module that sends a Slack message when a review finishes. Hexagonally, the work is small and predictable.

### 1. Sketch the boundary

What's the use case? "Notify a channel when a review completes." That's one application service: `NotifyOnReviewCompleteService`. It needs an outbound capability: send a notification. That's a port.

### 2. Lay out the folders

```
src/notifications/
├── domain/
│   ├── entities/
│   │   └── notification.entity.ts
│   └── ports/
│       └── notifier.port.ts
├── application/
│   └── services/
│       └── notify-on-review-complete.service.ts
├── infrastructure/
│   └── adapters/
│       └── slack-notifier.adapter.ts
└── notifications.module.ts
```

### 3. Define the port (domain)

```ts
// src/notifications/domain/ports/notifier.port.ts
export abstract class NotifierPort {
  abstract send(channel: string, message: string): Promise<void>;
}
```

Abstract class, not interface. No vendor types in sight.

### 4. Write the use case (application)

```ts
// src/notifications/application/services/notify-on-review-complete.service.ts
@Injectable()
export class NotifyOnReviewCompleteService {
  private readonly logger = new Logger(NotifyOnReviewCompleteService.name);

  constructor(private readonly notifier: NotifierPort) {}

  async run(repository: string, prNumber: number): Promise<void> {
    const message = `Review complete for ${repository}#${prNumber}`;
    await this.notifier.send('#code-review', message);
    this.logger.debug({ repository, prNumber }, 'Notification sent');
  }
}
```

The use case depends on the port. It does not know Slack exists.

### 5. Implement the adapter (infrastructure)

```ts
// src/notifications/infrastructure/adapters/slack-notifier.adapter.ts
@Injectable()
export class SlackNotifierAdapter extends NotifierPort {
  constructor(private readonly config: AppConfig) {
    super();
  }
  async send(channel: string, message: string): Promise<void> {
    // call the Slack webhook
  }
}
```

Vendor SDK errors get caught here and translated to a domain error if a higher layer needs to react to them.

### 6. Wire up the module

```ts
// src/notifications/notifications.module.ts
@Module({
  providers: [
    NotifyOnReviewCompleteService,
    { provide: NotifierPort, useClass: SlackNotifierAdapter },
  ],
  exports: [NotifyOnReviewCompleteService],
})
export class NotificationsModule {}
```

The binding `{ provide: NotifierPort, useClass: SlackNotifierAdapter }` is where domain meets infrastructure. Swap to `DiscordNotifierAdapter` later by changing this one line.

### 7. Register it

Add `NotificationsModule` to `AppModule.imports`. If the review module needs to call it, import it there.

That's the whole recipe. Same shape as `memory/`, `review/`, and every other existing module.

## Adding a new LLM provider

The LLM provider port is the cleanest example of the pattern in the codebase. Adding a sixth provider (say, Cohere) is mechanical.

### 1. Look at the port

```ts
// src/review/domain/ports/llm-provider.port.ts
export abstract class LlmProviderPort {
  abstract generateReview(prompt: string, maxTokens: number): Promise<LlmResponse>;
}
```

One method. That's the entire contract you have to satisfy.

### 2. Add the adapter

Create `src/review/infrastructure/llm/cohere-llm.adapter.ts`:

```ts
export class CohereLlmAdapter extends LlmProviderPort {
  private readonly client: CohereClient;
  private readonly model: string;

  constructor(config: AppConfig) {
    super();
    this.client = new CohereClient({ token: config.LLM_API_KEY });
    this.model = config.llmModelWithDefault;
  }

  async generateReview(prompt: string, maxTokens: number): Promise<LlmResponse> {
    try {
      const response = await this.client.chat({ /* ... */ });
      return {
        content: response.text,
        promptTokens: response.meta.tokens.input,
        completionTokens: response.meta.tokens.output,
        model: this.model,
      };
    } catch (error) {
      // translate vendor errors to LlmRateLimitError / LlmTimeoutError
      throw error;
    }
  }
}
```

Use `AnthropicLlmAdapter` as your reference — same structure, same error translation, same return shape.

### 3. Add the enum value

In `src/config/app.config.ts`, add `COHERE = 'cohere'` to the `LlmProvider` enum.

### 4. Register it in the factory

```ts
// src/review/infrastructure/llm/llm-provider.registry.ts
export function createLlmProvider(): Provider<LlmProviderPort> {
  return {
    provide: LlmProviderPort,
    inject: [AppConfig],
    useFactory: (config: AppConfig): LlmProviderPort => {
      switch (config.LLM_PROVIDER) {
        case LlmProvider.ANTHROPIC: return new AnthropicLlmAdapter(config);
        case LlmProvider.OPENAI:    return new OpenAiLlmAdapter(config);
        case LlmProvider.OLLAMA:    return new OllamaLlmAdapter(config);
        case LlmProvider.MISTRAL:   return new MistralLlmAdapter(config);
        case LlmProvider.GEMINI:    return new GeminiLlmAdapter(config);
        case LlmProvider.COHERE:    return new CohereLlmAdapter(config);
        default:
          throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER as string}`);
      }
    },
  };
}
```

The registry is a factory provider, not a class provider. It picks the adapter at startup based on `LLM_PROVIDER`. Nothing in the review pipeline cares which one it is.

### 5. Tests, docs, env

- Add a unit test for the adapter that fakes the SDK and checks error translation.
- Add the new value to the `LLM_PROVIDER` row in [Configuration](../reference/configuration.md) and [LLM Providers](./llm-providers.md).
- Add the SDK to `package.json` dependencies.

## Migrations

Migrations live under `src/shared/infrastructure/database/migrations/` and are run via the npm scripts:

```bash
npm run migration:generate   # generate from current entities (after build)
npm run migration:run        # apply pending migrations
npm run migration:revert     # revert last migration
```

Today, migrations are written by hand or generated against the built `dist/`. The plan (tracked under P6) is to move to fully auto-generated migrations as part of the build pipeline so the round-trip is one command. Until then, generate, inspect, and commit the SQL alongside the code change.

## When in doubt

- **Where does this code go?** If it knows about an external system, it's `infrastructure`. If it orchestrates a business operation, it's `application`. If it would still make sense in a vacuum, it's `domain`.
- **Should I make a port for this?** If something outside the module needs to talk to something inside the module, yes. If it's purely internal, no.
- **My use case has 200 lines and four branches.** Split it. Cognitive complexity 15 is the lint cap, not a target.
