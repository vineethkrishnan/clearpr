# ClearPR

**Your PR has 50 real changes buried under 20,000 lines of Prettier formatting. ClearPR fixes that.**

ClearPR is a self-hosted GitHub App that strips formatting noise from diffs, reviews code against your project guidelines, and learns from past PR feedback to catch repeat mistakes.

- **Repository:** https://github.com/vineethkrishnan/clearpr
- **Documentation:** https://clearpr-docs.pages.dev
- **License:** MIT

---

## Supported Tags

| Tag | Description |
| --- | --- |
| `latest` | Latest stable release |
| `X.Y.Z` | Specific patch version (pin this in production) |
| `X.Y` | Latest patch of a minor release |
| `X` | Latest minor of a major release |

Images are published multi-arch for **`linux/amd64`** and **`linux/arm64`**, on every release cut by [release-please](https://github.com/googleapis/release-please).

Also available on GHCR at `ghcr.io/vineethkrishnan/clearpr`.

---

## Quick Start

### 1. Pull the image

```bash
docker pull vineethnkrishnan/clearpr:latest
```

### 2. Create a `.env` file

```env
# Required
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key.pem
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# LLM Provider — choose one: anthropic, openai, ollama, mistral, gemini
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...

# Defaults match the compose snippet below
DATABASE_URL=postgresql://clearpr:clearpr@db:5432/clearpr
REDIS_URL=redis://redis:6379
```

### 3. Run with Docker Compose

Save this as `docker-compose.yml` next to your `.env`:

```yaml
services:
  app:
    image: vineethnkrishnan/clearpr:latest
    ports:
      - '3000:3000'
    env_file: .env
    environment:
      - NODE_ENV=production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: pgvector/pgvector:pg16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: clearpr
      POSTGRES_PASSWORD: clearpr
      POSTGRES_DB: clearpr
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U clearpr']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

Start it:

```bash
docker compose up -d
```

### 4. Verify

```bash
curl http://localhost:3000/health/live
# {"status":"ok"}
```

Install the GitHub App on your repos, open a PR, and ClearPR will review it.

---

## What ClearPR Does

- **Semantic diff filtering.** Parses code with tree-sitter and strips whitespace, formatter rewraps, trailing commas, quote style changes, and import reordering — so the diff only shows what actually changed.
- **AI code review against your rules.** Reviews the clean diff using your chosen LLM provider and the guidelines in your repo's `CLEARPR.md`.
- **Memory of past feedback.** Indexes the last 200 merged PRs on install, learns which feedback was accepted vs dismissed, and suppresses false alarms for patterns your team has already waved through.

---

## Configuration

All configuration is via environment variables. See the [full environment reference](https://clearpr-docs.pages.dev/reference/environment-variables) for every option.

Required:

- `GITHUB_APP_ID` — your GitHub App ID
- `GITHUB_PRIVATE_KEY` — path to (or contents of) the App private key
- `GITHUB_WEBHOOK_SECRET` — webhook secret from the App settings
- `LLM_PROVIDER` — `anthropic`, `openai`, `ollama`, `mistral`, or `gemini`
- `LLM_API_KEY` — provider API key (not needed for `ollama`)
- `DATABASE_URL` — Postgres connection string (requires the `pgvector` extension)
- `REDIS_URL` — Redis connection string (for the BullMQ work queue)

---

## Health Checks

The container exposes two health endpoints suitable for container orchestrators and load balancers:

- `GET /health/live` — liveness probe (process is up)
- `GET /health/ready` — readiness probe (database and Redis reachable)

---

## Ports

- **3000** — HTTP API and GitHub webhook endpoint

---

## Volumes

The image itself is stateless. Persistent state lives in the Postgres and Redis services (see the compose snippet above).

---

## Links

- **Source & issues:** https://github.com/vineethkrishnan/clearpr
- **Docs:** https://clearpr-docs.pages.dev
- **Changelog:** https://github.com/vineethkrishnan/clearpr/blob/main/CHANGELOG.md
- **Security policy:** https://github.com/vineethkrishnan/clearpr/blob/main/SECURITY.md
