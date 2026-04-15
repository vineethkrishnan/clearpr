# Getting Started

## Prerequisites

- Docker and Docker Compose
- A GitHub App (see [GitHub App Setup](./github-app-setup))
- An API key for your chosen LLM provider

## Install with the pre-built Docker image (recommended)

Released versions are published to GitHub Container Registry and Docker Hub on every tag.

### 1. Pull the image

```bash
# GitHub Container Registry
docker pull ghcr.io/vineethkrishnan/clearpr:latest

# …or Docker Hub
docker pull vineethkrishnan/clearpr:latest
```

Pin to a specific version (`:1.2.3`), a minor (`:1.2`), or a major (`:1`) instead of `:latest` for production.

### 2. Configure environment

Create a `.env` file next to your compose file:

```env
# Required
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key.pem
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# LLM Provider (choose one)
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...

# Database (defaults work with the compose snippet below)
DATABASE_URL=postgresql://clearpr:clearpr@db:5432/clearpr
REDIS_URL=redis://redis:6379
```

### 3. Run with Docker Compose

Save as `docker-compose.yml` alongside your `.env`:

```yaml
services:
  app:
    image: ghcr.io/vineethkrishnan/clearpr:latest
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

## Install from source

Use this path if you need to modify the code, run the latest unreleased commits, or build your own image.

### 1. Clone the repository

```bash
git clone https://github.com/vineethkrishnan/clearpr.git
cd ClearPR
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the same values as shown in the Docker image section above.

### 3. Start ClearPR

```bash
docker compose up -d
```

The bundled `docker-compose.yml` builds the app image from source.

### 4. Verify

```bash
curl http://localhost:3000/health/live
# {"status":"ok"}
```

## Development Setup

For local development without Docker for the app:

```bash
# Install dependencies
npm install

# Start only database services
docker compose -f docker-compose.dev.yml up -d

# Start in dev mode
npm run start:dev
```

## Next Steps

- [Set up your GitHub App](./github-app-setup)
- [Choose an LLM provider](./llm-providers)
- [Configure project guidelines](./project-config)
