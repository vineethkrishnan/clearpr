# Docker Deployment

::: warning
The `docker-compose.yml` shipped with this repo is a starting point for self-hosting. Before opening port 3000 to the internet:

- Change `POSTGRES_PASSWORD` from the default `clearpr`
- Remove the `5432` and `6379` host port mappings on `db` and `redis` (they should only be reachable inside the docker network)
- Change `REDIS_PASSWORD` if you set one
:::

## Quick Deploy

```bash
git clone https://github.com/vineethkrishnan/ClearPR.git
cd ClearPR
cp .env.example .env
# Edit .env with your credentials
docker compose up -d
```

## Database Migrations

Migrations run **automatically on container start**. The image entrypoint runs `typeorm migration:run` before the app boots, so a fresh database is schema-ready on the first `docker compose up -d`, and any new migration in a release is applied when the new image starts. You'll see it in the logs:

```
[entrypoint] Running TypeORM migrations...
... No migrations are pending
[entrypoint] Starting application...
```

For zero-downtime deploys with a **breaking** migration, apply it out-of-band before rolling the new image:

```bash
docker compose run --rm app npm run migration:run
```

Additive (non-breaking) migrations are safe to let the entrypoint apply during a normal rolling deploy.

## Connecting to Postgres and Redis (TLS)

In production (`NODE_ENV=production`, which the shipped compose sets), ClearPR **defaults to requiring TLS** for both Postgres and Redis. The bundled `db` and `redis` services are plain (no TLS), so if you use them as-is you must turn TLS off explicitly or the app crash-loops on boot:

```env
DATABASE_SSL=false
REDIS_TLS=false
```

Symptoms if you forget:

- Postgres: `Error: The server does not support SSL connections` (app restarts in a loop)
- Redis: repeated `ioredis ... connect ETIMEDOUT` on a TLS socket, and `/health/ready` hangs

Leave them at the production default (TLS on) only when your Postgres/Redis actually terminate TLS, e.g. a managed database or `rediss://` endpoint.

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

A single ClearPR image runs both the HTTP API and the BullMQ queue consumers in the same Node process (`node dist/main.js`). There is no separate worker entry point and no `WORKER_ONLY` switch, so you scale by running more replicas of the same image.

```bash
docker compose up -d --scale app=3
```

BullMQ coordinates job claims through Redis, so multiple replicas can consume the same queues safely without duplicate processing. Each replica also serves HTTP, so put a load balancer (Caddy, nginx, your cloud LB) in front and let it fan webhook traffic across all of them.

Per-replica concurrency is set on each consumer (see `src/queue/consumers/*.ts`):

| Queue | Concurrency per replica |
|---|---|
| `reviews` | 3 |
| `commands` | 5 |
| `indexing` | 2 |

So three replicas give you up to 9 concurrent reviews, 15 concurrent commands, and 6 concurrent indexing jobs. Tune the replica count based on observed queue depth and LLM rate limits, not CPU.

Splitting the API and worker into separate processes is on the roadmap; for now, scale the unit.

## System Requirements

| | Minimum | Recommended |
|---|---|---|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Storage | 10 GB | 20 GB |
| Network | Public HTTPS endpoint | Static IP + SSL |
