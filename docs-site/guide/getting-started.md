# Getting Started

## Prerequisites

- Docker and Docker Compose
- A GitHub App (see [GitHub App Setup](./github-app-setup))
- An API key for your chosen LLM provider

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/vineethkrishnan/clearpr.git
cd ClearPR
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key.pem
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# LLM Provider (choose one)
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...

# Database (defaults work with Docker Compose)
DATABASE_URL=postgresql://clearpr:clearpr@db:5432/clearpr
REDIS_URL=redis://redis:6379
```

### 3. Start ClearPR

```bash
docker compose up -d
```

### 4. Verify

```bash
curl http://localhost:3000/health/live
# {"status":"ok"}
```

That's it. Install the GitHub App on your repos, open a PR, and ClearPR will review it.

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
