// Default retry-after duration when a 429 response has no Retry-After header
export const DEFAULT_RATE_LIMIT_RETRY_SECONDS = 60;

// The agent runs `claude -p` as a subprocess, which can take minutes on a
// large review. Matches the agent's own 600s ceiling.
export const AGENT_REQUEST_TIMEOUT_MS = 600_000;
