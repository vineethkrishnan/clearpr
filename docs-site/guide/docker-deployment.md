# Docker Deployment

## Quick Deploy

```bash
git clone https://github.com/vineethkrishnan/ClearPR.git
cd ClearPR
cp .env.example .env
# Edit .env with your credentials
docker compose up -d
```

## Services

| Service | Image | Purpose |
|---|---|---|
| `app` | Custom (Dockerfile) | NestJS API + BullMQ workers |
| `db` | `pgvector/pgvector:pg16` | PostgreSQL with vector extension |
| `redis` | `redis:7-alpine` | Job queues, caching, token storage |

## Health Checks

```bash
# Liveness — is the process running?
curl http://localhost:3000/health/live

# Readiness — are DB and Redis connected?
curl http://localhost:3000/health/ready

# Full health — includes queue status
curl http://localhost:3000/health
```

## HTTPS / TLS

ClearPR does not handle TLS. Deploy behind a reverse proxy:

### Caddy (recommended)

```
your-domain.com {
    reverse_proxy app:3000
}
```

### nginx

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Scaling

For higher load, separate the worker from the API:

```yaml
services:
  api:
    build: .
    command: node dist/main.js
    # HTTP only, no queue consumers

  worker:
    build: .
    command: node dist/main.js
    # Queue consumers only
    # Scale: docker compose up -d --scale worker=3
```

## System Requirements

| | Minimum | Recommended |
|---|---|---|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Storage | 10 GB | 20 GB |
| Network | Public HTTPS endpoint | Static IP + SSL |
