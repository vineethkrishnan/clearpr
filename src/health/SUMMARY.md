# health

## Purpose

Liveness, readiness, and operational visibility for the running process. Exposes the standard Kubernetes-style probes plus a queue-depth check that fails the readiness probe when the cumulative failed-job count across `reviews`, `commands`, and `indexing` crosses a hard threshold (effectively turning a runaway DLQ into a deploy-blocking signal).

## Ports exposed (interfaces other modules can depend on)

None.

## Ports consumed (dependencies on other modules)

- **`QUEUE_NAMES` and the three BullMQ queues (from `queue`)** - injected via `BullModule.registerQueue` to read `getJobCounts` for waiting/active/delayed/failed.
- **`REDIS_CLIENT` (from `shared/redis`)** - optional injection; pinged for the Redis health indicator.
- **`TypeOrmHealthIndicator` (from `@nestjs/terminus`)** - pings the database for the database indicator.

## Domain entities

None. Health is a pure observability module - no domain model.

## Domain value objects

None.

## Domain errors

None.

## Use cases / services

None as services. The controller composes Terminus's `HealthCheckService` indicators inline:
- database ping (`TypeOrmHealthIndicator.pingCheck`),
- Redis ping (only if a Redis client is bound),
- queue stats with a DLQ-failed-count threshold (`DLQ_FAIL_THRESHOLD = 100`).

## HTTP surface

- `GET /health` - full health check (database + Redis + queues). Returns 200 if all up, 503 otherwise.
- `GET /health/ready` - readiness probe; same indicator set as `/health`.
- `GET /health/live` - liveness probe; always returns `{ status: 'ok' }` and never touches dependencies.

## Invariants

- `/health/live` has zero external dependencies - it never calls the database, Redis, or the queues. A liveness failure means the process is genuinely dead.
- Readiness fails when total failed jobs across the three queues exceed `DLQ_FAIL_THRESHOLD` (100), independent of database or Redis status.
- The Redis indicator is opt-in: if no Redis client is bound (e.g. local dev without Redis), the indicator is skipped rather than reporting `down`.
- Queue stats are fetched in parallel (`Promise.all`) so a slow queue does not serialize the others.
