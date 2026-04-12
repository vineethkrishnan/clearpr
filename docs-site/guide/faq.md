# FAQ & Troubleshooting

## General

### Does ClearPR block merging?

No. ClearPR posts advisory reviews only. It never approves, requests changes, or blocks PRs. Your existing merge rules and required reviewers are unaffected.

### Which languages does ClearPR support?

The semantic diff engine has dedicated normalizers for **TypeScript**, **JavaScript**, **PHP**, **JSON**, and **YAML**. For all other languages, ClearPR falls back to whitespace-only filtering (strips blank lines and trailing spaces). The AI review works with any language the LLM understands.

### How much noise does it actually filter?

Depends on the PR. A Prettier-only reformatting PR might go from 20,000 raw diff lines to 0 semantic lines (100% noise). A typical mixed PR with formatting + real changes usually sees 60-90% noise reduction.

### Can I use ClearPR without the AI review?

Yes. Use `@clearpr diff` to get just the semantic diff posted as a comment — no LLM call is made. You can also set `MAX_DIFF_LINES=0` to effectively disable AI reviews while keeping the semantic diff computation.

### Is my code sent to external services?

Only to the LLM provider you configure (e.g., Anthropic, OpenAI). Source code is processed in memory and never persisted to disk or database. Only review comments and small surrounding diff hunks are stored for the memory system.

## Setup Issues

### ClearPR isn't receiving webhooks

1. **Check the webhook URL** — it must be reachable from GitHub's servers. Use `curl https://your-domain/health/live` from an external machine.
2. **Check the webhook secret** — `GITHUB_WEBHOOK_SECRET` must match exactly what you entered in the GitHub App settings.
3. **Check GitHub's delivery log** — go to your GitHub App settings > Advanced > Recent Deliveries. Look for failed deliveries and their HTTP status codes.
4. **Check ClearPR logs** — `docker compose logs app` should show incoming webhook requests. If you see nothing, the request isn't reaching your server.

### Health check returns unhealthy

```bash
curl http://localhost:3000/health
```

The response shows the status of each subsystem:
- **database: down** — PostgreSQL isn't running or `DATABASE_URL` is wrong
- **redis: down** — Redis isn't running or `REDIS_URL` is wrong
- **queues: down** — too many failed jobs in the dead-letter queue (threshold: 100)

### Reviews aren't being posted

1. **Check the GitHub App permissions** — Pull requests must have Read & Write access.
2. **Check the LLM API key** — an invalid key causes silent failures. Check logs: `docker compose logs app | grep -i "error\|fail"`
3. **Check the installation** — the repo must be included in the GitHub App installation. Go to Settings > GitHub Apps > Configure on the installed app.
4. **Check the queue** — `curl http://localhost:3000/health` shows queue depths. If `reviews.failed` is high, jobs are failing.

### Duplicate reviews on the same PR

ClearPR has a 30-second debounce window. If you push multiple commits within 30 seconds, only the latest SHA is reviewed. If you're still seeing duplicates, check that your webhook isn't configured to send to multiple URLs.

## Configuration

### How do I change the LLM model?

Set the `LLM_MODEL` environment variable:

```env
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
```

See [LLM Providers](./llm-providers) for all supported providers and their default models.

### How do I reduce review noise (too many info-level comments)?

Add a `.reviewconfig` file to your repo:

```yaml
severity: warning  # Only post warning and critical findings
```

See [Project Config](./project-config) for all options.

### How do I ignore generated files?

Two options:

**Per-repo** (permanent) — add to `.reviewconfig`:
```yaml
ignore:
  - '**/*.generated.ts'
  - 'vendor/**'
```

**Per-PR** (temporary) — comment on the PR:
```
@clearpr ignore **/*.generated.ts
```

### Can I use ClearPR with a self-hosted GitHub Enterprise instance?

Not in v1.0. ClearPR currently targets `api.github.com`. GitHub Enterprise Server support is planned for a future release.

## Performance

### How long does a review take?

| PR size | Typical latency |
|---|---|
| < 500 semantic diff lines | < 60 seconds |
| 500 - 2,000 lines | < 120 seconds |
| > 5,000 lines (default limit) | Skipped with explanation comment |

The webhook is acknowledged in < 500ms. The review runs asynchronously in the background.

### ClearPR is slow on large PRs

- **Increase concurrency**: set `REVIEW_CONCURRENCY` (default: 3) to process more files in parallel.
- **Reduce the diff limit**: lower `MAX_DIFF_LINES` to skip very large PRs faster.
- **Use a faster LLM**: Ollama with a local model avoids network latency to external APIs.

### Memory usage is growing

The PR memory system stores one embedding (~2 KB) per review comment from merged PRs. At 10,000 entries per repo, this is roughly 20 MB. If storage is a concern, reduce `HISTORY_DEPTH` (default: 200 merged PRs indexed).
