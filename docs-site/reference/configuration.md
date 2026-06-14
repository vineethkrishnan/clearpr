# Configuration Reference

All configuration is via environment variables. Set them in `.env` or pass directly.

## Required Variables

| Variable | Description |
|---|---|
| `GITHUB_APP_ID` | GitHub App ID. Must belong to the **same** App that is installed and sending webhooks (see troubleshooting if reviews/indexing fail with a 404). |
| `GITHUB_PRIVATE_KEY` | The private key **contents** (PEM) of that same App, with real newlines, not a file path. In `.env`, the simplest reliable form is a double-quoted value spanning multiple lines. |
| `GITHUB_WEBHOOK_SECRET` | HMAC secret for webhook verification. Must match the secret configured on the GitHub App's webhook exactly. |
| `LLM_API_KEY` | API key for the selected LLM provider (not required for Ollama) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |

## LLM Configuration

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `anthropic` | `anthropic`, `openai`, `ollama`, `mistral`, `gemini`, `agent` |
| `LLM_MODEL` | (per provider) | Model ID override |
| `LLM_BASE_URL` | (per provider) | Custom API base URL. Required for `ollama` and for `agent` (the agent's `host:port`; ClearPR appends `/trigger`). |

## Embedding Configuration

| Variable | Default | Description |
|---|---|---|
| `EMBEDDING_PROVIDER` | `voyage` | `voyage` (API) or `local` (in-process via transformers.js, no API key). Used only by the PR-memory feature. |
| `EMBEDDING_MODEL` | per provider | Model ID. Defaults: `voyage-3-lite` (voyage), `Xenova/all-MiniLM-L6-v2` (local). |
| `EMBEDDING_DIMENSIONS` | `512` | Vector dimension. Must match the chosen model (`voyage-3-lite` = 512, `voyage-3` = 1024, `all-MiniLM-L6-v2` = 384). Drives the `pr_memory.embedding` column type; a migration re-aligns it if you change providers. |
| `EMBEDDING_CACHE_DIR` | (package cache) | Where `local` embeddings cache the downloaded model. Set to a mounted volume (e.g. `/app/models`) so it persists across restarts. |
| `VOYAGE_API_KEY` | — | Voyage AI API key (only for `EMBEDDING_PROVIDER=voyage`). |

::: tip Local embeddings need a glibc image
`EMBEDDING_PROVIDER=local` loads native `onnxruntime` bindings, which do not work on Alpine/musl. The shipped image is `node:slim` (glibc) for this reason. If you build a custom image, base it on a glibc distro, not Alpine.
:::

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
| `DATABASE_SSL` | (on if `NODE_ENV=production`) | Require TLS to Postgres. **Set `false` when using the bundled (plain) `db` service**, otherwise the app crash-loops with `The server does not support SSL connections`. |
| `REDIS_TLS` | (on if `NODE_ENV=production`) | Require TLS to Redis. **Set `false` when using the bundled (plain) `redis` service**, otherwise connections time out and `/health/ready` hangs. |

::: warning
Never commit `.env` files. Use `.env.example` as a template.
:::

::: tip Self-hosting with the bundled database/redis?
The shipped `docker-compose.yml` runs plain Postgres and Redis but sets `NODE_ENV=production`, which defaults both `DATABASE_SSL` and `REDIS_TLS` to on. Add `DATABASE_SSL=false` and `REDIS_TLS=false` to your `.env` for that setup. Only enable them when your database/redis actually terminate TLS (e.g. a managed service).
:::
