# API Endpoints

ClearPR exposes a minimal HTTP API.

## Webhook

### `POST /webhook`

Receives GitHub webhook events. Protected by HMAC-SHA256 signature verification.

**Headers:**
- `X-Hub-Signature-256` (required) — HMAC signature
- `X-GitHub-Event` (required) — Event type
- `X-GitHub-Delivery` (required) — Unique delivery ID

**Response:** `200 OK` with `{ "received": true }`

**Error:** `401 Unauthorized` if signature is invalid or missing.

## Health Checks

### `GET /health`

Full health check — verifies database and Redis connectivity.

**Response:**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### `GET /health/ready`

Readiness probe for container orchestrators. Same checks as `/health`.

### `GET /health/live`

Liveness probe. Always returns `200` if the process is running.

```json
{ "status": "ok" }
```

## No Admin API

ClearPR has no admin API in v1. All configuration is via environment variables and repo-level config files.
