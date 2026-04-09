# Configuration Reference

All configuration is via environment variables. Set them in `.env` or pass directly.

## Required Variables

| Variable | Description |
|---|---|
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Path to `.pem` file or key content |
| `GITHUB_WEBHOOK_SECRET` | HMAC secret for webhook verification |
| `LLM_API_KEY` | API key for the selected LLM provider (not required for Ollama) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |

## LLM Configuration

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `anthropic` | `anthropic`, `openai`, `ollama`, `mistral`, `gemini` |
| `LLM_MODEL` | (per provider) | Model ID override |
| `LLM_BASE_URL` | (per provider) | Custom API base URL |

## Embedding Configuration

| Variable | Default | Description |
|---|---|---|
| `EMBEDDING_PROVIDER` | `voyage` | `voyage` or `local` |
| `EMBEDDING_MODEL` | `voyage-3-lite` | Embedding model ID |
| `VOYAGE_API_KEY` | — | Voyage AI API key |

## Application Settings

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `production` | `development`, `production`, `test` |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

## Review Tuning

| Variable | Default | Description |
|---|---|---|
| `MAX_DIFF_LINES` | `5000` | Skip review if semantic diff exceeds this |
| `MAX_FILE_SIZE_KB` | `100` | Skip AST parsing for files larger than this |
| `HISTORY_DEPTH` | `200` | Past PRs to index for memory |
| `REVIEW_CONCURRENCY` | `3` | Max concurrent review jobs |
| `SIMILARITY_THRESHOLD` | `0.75` | Minimum cosine similarity for memory matches |
| `DEBOUNCE_WINDOW_MS` | `30000` | Debounce window for rapid pushes |

## Security

| Variable | Default | Description |
|---|---|---|
| `REDIS_PASSWORD` | — | Redis auth password (recommended in production) |

::: warning
Never commit `.env` files. Use `.env.example` as a template.
:::
