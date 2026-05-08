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

The container does NOT auto-run migrations. You need to run them yourself the first time you bring the stack up, and again after every release that ships a new migration.

On a fresh database, after `docker compose up -d`:

```bash
docker compose run --rm app npm run migration:run
```

After each release that includes a new migration, run the same command again before the new image starts serving traffic.

For production, the safest order is:

1. Stop the app: `docker compose stop app`
2. Run migrations: `docker compose run --rm app npm run migration:run`
3. Start the app: `docker compose start app`

If your migrations are non-breaking (additive only), a blue/green or rolling deploy works too: run the migration first, then roll the new image.

Future: a parallel PR (`feat(docker): ...`) is adding migration-on-startup; once that lands, this manual step goes away.

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
