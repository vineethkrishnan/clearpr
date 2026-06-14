# LLM Providers

ClearPR supports **5 LLM providers** out of the box. Switch providers with a single environment variable.

## Provider Configuration

Set `LLM_PROVIDER` in your `.env` file:

| Provider | `LLM_PROVIDER` | Default Model | API Key Required |
|---|---|---|---|
| Anthropic Claude | `anthropic` | `claude-sonnet-4-20250514` | Yes |
| OpenAI | `openai` | `gpt-4o` | Yes |
| Ollama | `ollama` | `llama3` | No |
| Mistral | `mistral` | `mistral-large-latest` | Yes |
| Google Gemini | `gemini` | `gemini-2.5-pro` | Yes |
| Local Agent | `agent` | `claude-code` | No (bearer token) |

## Anthropic Claude (Default)

```env
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-api03-...
# LLM_MODEL=claude-sonnet-4-20250514  # optional
```

Best review quality. ClearPR's prompts are optimized for Claude.

## OpenAI

```env
LLM_PROVIDER=openai
LLM_API_KEY=sk-proj-...
# LLM_MODEL=gpt-4o
```

Also works with **Azure OpenAI** by setting `LLM_BASE_URL`:

```env
LLM_PROVIDER=openai
LLM_API_KEY=your-azure-key
LLM_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
```

## Ollama (Local / Self-Hosted)

```env
LLM_PROVIDER=ollama
LLM_MODEL=llama3
LLM_BASE_URL=http://localhost:11434/v1
```

No API key needed. Runs entirely on your hardware. Best for data-sensitive environments.

::: tip
Make sure Ollama is running and the model is pulled:
```bash
ollama pull llama3
```
:::

## Mistral

```env
LLM_PROVIDER=mistral
LLM_API_KEY=your-mistral-key
# LLM_MODEL=mistral-large-latest
```

## Google Gemini

```env
LLM_PROVIDER=gemini
LLM_API_KEY=your-google-ai-key
# LLM_MODEL=gemini-2.5-pro
```

## Local Agent (Claude Code)

Route reviews through a local Claude Code agent that exposes `POST /trigger` and runs `claude -p` non-interactively. This reuses an existing Claude subscription on the host instead of an API key.

```env
LLM_PROVIDER=agent
LLM_BASE_URL=http://host.docker.internal:8765
LLM_API_KEY=your-agent-bearer-token
```

`LLM_BASE_URL` points at the agent's host and port; ClearPR appends `/trigger`. `LLM_API_KEY` is sent as `Authorization: Bearer <token>`. The agent is expected to return `{ ok, result: { result, usage, modelUsage } }`, where `result.result` is the review text.

::: tip
When ClearPR runs in Docker and the agent runs on the host, use `host.docker.internal` so the container can reach it, and add `extra_hosts: ["host.docker.internal:host-gateway"]` to the app service in `docker-compose.yml`.
:::

## Custom Model

Override the default model for any provider:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo
```

## Embeddings (PR memory)

Separate from the LLM, the PR-memory feature embeds past review comments so it can flag repeat issues. Pick the embedding provider with `EMBEDDING_PROVIDER`:

| Provider | `EMBEDDING_PROVIDER` | Default model | Dimensions | API key |
|---|---|---|---|---|
| Voyage AI | `voyage` | `voyage-3-lite` | 512 | Yes (`VOYAGE_API_KEY`) |
| Local | `local` | `Xenova/all-MiniLM-L6-v2` | 384 | No |

**Local** runs a sentence-transformers model in-process via transformers.js, no API key, fully on-box. It downloads the model once (cache it on a volume with `EMBEDDING_CACHE_DIR`):

```env
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
EMBEDDING_DIMENSIONS=384
EMBEDDING_CACHE_DIR=/app/models
```

::: warning
`EMBEDDING_DIMENSIONS` must match the model (512 for `voyage-3-lite`, 384 for `all-MiniLM-L6-v2`). Local embeddings require a glibc-based image (the shipped image is `node:slim`); they will not load on Alpine. If you leave `EMBEDDING_PROVIDER` unset/`voyage` with no key, PR memory is silently skipped and the rest of the review still works.
:::

## Architecture

All providers extend the same `LlmProviderPort` abstract class. The `LlmProviderRegistry` selects the right adapter at startup based on `LLM_PROVIDER`. Adding a new provider means creating one adapter file - no changes to domain logic.

```
LlmProviderPort (abstract)
├── AnthropicLlmAdapter
├── OpenAiLlmAdapter
├── OllamaLlmAdapter
├── MistralLlmAdapter
├── GeminiLlmAdapter
└── AgentLlmAdapter
```
