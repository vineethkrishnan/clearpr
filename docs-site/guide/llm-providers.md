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

## Custom Model

Override the default model for any provider:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo
```

## Architecture

All providers implement the same `LlmProviderPort` interface. The `LlmProviderRegistry` selects the right adapter at startup based on `LLM_PROVIDER`. Adding a new provider means creating one adapter file — no changes to domain logic.

```
LlmProviderPort (abstract)
├── AnthropicLlmAdapter
├── OpenAiLlmAdapter
├── OllamaLlmAdapter
├── MistralLlmAdapter
└── GeminiLlmAdapter
```
