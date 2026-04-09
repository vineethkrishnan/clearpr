# ClearPR — Product Requirements Document

> **Version:** 0.2.0-draft
> **Last updated:** 2026-04-09
> **Author:** Vineeth N K
> **Status:** Pre-architecture review

---

## 1. Problem Statement

Code reviewers waste significant time scrolling through formatting noise in pull requests. A single Prettier run can produce 20,000+ line diffs where only 50 lines actually changed behavior. GitHub's "Hide whitespace" toggle doesn't help because formatters change more than whitespace — they rewrap lines, reorder imports, toggle trailing commas, and change quote styles.

This leads to:
- Reviewers skipping large diffs entirely ("LGTM, I trust you")
- Real bugs hiding in formatting noise
- Repeated review feedback for the same patterns across PRs
- Wasted Claude/LLM tokens when sending raw diffs to AI review tools

## 2. Solution

ClearPR is a **self-hosted GitHub App** that:

1. **Strips formatting noise** — parses code into ASTs via tree-sitter, compares structure instead of text, and produces a clean "semantic diff" containing only behavioral changes
2. **Reviews the clean diff with AI** — sends the semantic diff to Claude along with the project's own coding guidelines for context-aware review
3. **Learns from past reviews** — indexes prior PR feedback using vector embeddings, surfaces relevant past mistakes when similar patterns appear

## 3. Target Users

| Persona | Pain point |
|---------|-----------|
| **Tech lead** reviewing 10+ PRs/week | Can't find real changes in formatter-heavy diffs |
| **Solo developer** using AI review tools | Pays for LLM tokens wasted on formatting noise |
| **Team** with coding standards documented | Standards exist but aren't enforced systematically |
| **Platform/DevX engineer** | Wants self-hosted, auditable review tooling — not a SaaS black box |

## 4. Scope

### 4.1 In scope (v1.0)

- GitHub App receiving webhooks for PR events
- Semantic diff engine using tree-sitter (TypeScript, JavaScript, PHP, JSON, YAML)
- AI review using Anthropic Claude API
- Project guideline loading (claude.md, agent.md, .reviewconfig)
- Past PR memory using pgvector
- PR commands via issue comments (@clearpr review, diff, ignore, config)
- Docker Compose deployment
- Advisory-only reviews (never blocks merging)

### 4.2 Out of scope (v1.0)

- Multi-LLM provider support (OpenAI, Ollama)
- GitLab / Bitbucket support
- Web dashboard or UI
- Slack/Teams notifications
- Auto-fix suggestions via GitHub suggested changes
- IDE plugins
- Multi-repo shared guidelines
- SaaS / hosted offering

---

## 5. Feature Specifications

### 5.1 Webhook Handler

#### Events

| GitHub Event | Action | ClearPR Behavior |
|---|---|---|
| `pull_request` | `opened` | Queue full review |
| `pull_request` | `synchronize` | Queue full review (new commits pushed) |
| `pull_request` | `reopened` | Queue full review |
| `pull_request_review_comment` | `created` | Check if body starts with `@clearpr`, route to command handler |
| `issue_comment` | `created` | Check if body starts with `@clearpr`, route to command handler |
| `installation` | `created` | Register installation, queue initial PR history indexing |
| `installation` | `deleted` | Mark installation inactive, schedule data cleanup |
| `installation_repositories` | `added` / `removed` | Update tracked repositories |

#### Security

- **HMAC-SHA256 signature verification** on every incoming request — reject before any processing if signature is invalid
- Verify the `X-Hub-Signature-256` header against `GITHUB_WEBHOOK_SECRET`
- Return `401` for invalid signatures, `200` for valid (even if processing fails — to prevent information leakage)
- Log rejected signature attempts with source IP (no request body)

#### Idempotency

- Derive an idempotency key from `delivery_id` (the `X-GitHub-Delivery` header)
- Store processed delivery IDs in Redis with a 24-hour TTL
- If a duplicate delivery arrives, return `200` and skip processing
- This handles GitHub's automatic webhook retries without duplicate reviews

#### Rate Limiting

- Accept webhooks as fast as GitHub sends them (no inbound throttling)
- Outbound GitHub API calls respect `X-RateLimit-Remaining` headers
- When remaining < 100: slow queue processing
- When remaining < 10: pause queue, resume when reset timestamp passes
- Log rate limit events for observability

### 5.2 Semantic Diff Engine

#### How It Works

1. Fetch the PR diff from GitHub API (`GET /repos/{owner}/{repo}/pulls/{pr}/files`)
2. For each changed file:
   a. Fetch the base version and head version of the file content
   b. Determine language from file extension (with `.reviewconfig` overrides)
   c. Parse both versions into ASTs using tree-sitter
   d. Normalize both ASTs (strip formatting-only nodes)
   e. Compare normalized ASTs to produce a semantic diff
   f. If tree-sitter parsing fails, fall back to whitespace-only filtering
3. Aggregate semantic diffs across all files
4. If total semantic diff lines > `MAX_DIFF_LINES`, skip AI review and post a comment explaining why

#### Normalization Rules by Language

**TypeScript / JavaScript:**
- Strip whitespace, indentation, trailing newlines
- Normalize quote style (treat `'` and `"` as equivalent)
- Remove trailing commas from arrays, objects, function parameters
- Remove semicolons (treat presence/absence as equivalent)
- Sort import specifiers alphabetically (same imports, different order = no diff)
- Ignore parenthesization changes that don't affect precedence

**PHP:**
- Strip whitespace, indentation
- Normalize quote style for non-interpolated strings
- Remove trailing commas
- Ignore `use` statement ordering

**JSON:**
- Parse and re-serialize with sorted keys — structural comparison only
- Ignore whitespace entirely

**YAML:**
- Parse to data structure and compare values
- Ignore comment changes, indentation style, quoting style

**Fallback (unsupported languages):**
- Strip leading/trailing whitespace per line
- Collapse multiple blank lines to single blank line
- Compare remaining lines as text

#### Edge Cases

| Scenario | Behavior |
|---|---|
| Binary file changed | Skip entirely, exclude from semantic diff |
| File added (no base version) | Include full file in semantic diff (all lines are "real changes") |
| File deleted | Include full deletion in semantic diff |
| File renamed without content change | Report rename only, no diff lines |
| File > 100KB | Skip tree-sitter parsing, use whitespace fallback |
| tree-sitter parse error | Fall back to whitespace-only filtering, log warning |
| Mixed formatting + real changes in same file | Both survive — formatting stripped, real changes preserved |

#### Performance Targets

- Process a 500-file PR in < 30 seconds (tree-sitter parsing is CPU-bound)
- Memory usage < 256MB per file being parsed
- Parallelize file processing with configurable concurrency (default: 4 files)

### 5.3 AI Review Engine

#### Pipeline

1. **Load project guidelines**
   - Check repo for `claude.md` → `agent.md` → `.reviewconfig` (first found wins)
   - For `.reviewconfig`: fetch all referenced guideline files from the repo
   - Cache guidelines per repository + commit SHA (invalidate when base branch updates)

2. **Retrieve relevant past PR memory**
   - Embed the semantic diff summary
   - Query pgvector for top-5 similar past review comments
   - Filter to comments with `outcome = accepted` (proven valuable feedback)
   - Include as additional context in the prompt

3. **Construct the prompt**
   ```
   System: You are a code reviewer. Review the following diff against the
   project guidelines provided. Only comment on meaningful issues — not style
   preferences already handled by formatters.

   <project-guidelines>
   {guidelines content}
   </project-guidelines>

   <past-feedback>
   {relevant past review comments with their context}
   </past-feedback>

   <semantic-diff>
   {the clean diff, file by file}
   </semantic-diff>

   Respond with JSON: an array of inline comments and a summary.
   ```

4. **Parse AI response into structured review**
5. **Post to GitHub** via the Pull Request Review API

#### Prompt Token Budget

| Component | Budget |
|-----------|--------|
| System prompt + instructions | ~500 tokens |
| Project guidelines | max 4,000 tokens (truncate with notice if exceeded) |
| Past PR memory context | max 2,000 tokens |
| Semantic diff | remaining budget up to model context limit |
| Response | reserved 4,000 tokens |

If the semantic diff exceeds remaining budget after guidelines + memory:
- Prioritize files by change size (largest first)
- Truncate with `[... N more files not reviewed due to size ...]`
- Mention truncation in summary comment

#### Review Output Format

Each review produces:

**Inline comments** (posted on specific lines):
```json
{
  "path": "src/auth/login.service.ts",
  "line": 42,
  "side": "RIGHT",
  "severity": "warning",
  "body": "**[warning]** This catch block swallows the error silently..."
}
```

**Summary comment** (posted as PR comment):
```markdown
## ClearPR Review

**Diff stats:** 20,847 raw lines → 47 semantic lines (99.8% noise filtered)

### Findings
- 2 warnings
- 1 info

### Details
| # | Severity | File | Line | Issue |
|---|----------|------|------|-------|
| 1 | warning | src/auth/login.service.ts | 42 | Silent error swallowing |
| 2 | warning | src/queue/processor.ts | 118 | Missing null check |
| 3 | info | src/config/reader.ts | 7 | Consider extracting constant |

> Reviewed against project guidelines from `claude.md`.
> Past feedback from 3 similar PRs was considered.
```

#### Severity Levels

| Level | Meaning | When to use |
|---|---|---|
| `critical` | Security vulnerability, data loss risk | Injection, auth bypass, unvalidated input at system boundary |
| `warning` | Bug likely, logic error, missing error handling | Null deref, swallowed errors, race conditions |
| `info` | Suggestion, minor improvement | Naming, slight refactor opportunity, readability |

The `.reviewconfig` `severity` setting acts as a **minimum threshold** — if set to `warning`, `info` findings are suppressed from the posted review.

#### Error Handling

| Failure | Behavior |
|---|---|
| Claude API timeout (> 60s) | Retry up to 2 times with exponential backoff (30s, 60s) |
| Claude API 5xx error | Retry up to 2 times, then post comment: "Review temporarily unavailable" |
| Claude API rate limit (429) | Respect `Retry-After` header, re-queue the job |
| Malformed AI response (can't parse JSON) | Retry once with adjusted prompt, then post raw response as summary comment |
| Guidelines file not found in repo | Proceed without guidelines, note in summary |

### 5.4 Past PR Memory System

#### What Gets Stored

For each merged PR in a tracked repository:
- Each human-written review comment (not bot comments, not ClearPR's own comments)
- The code context: file path, line range, diff hunk surrounding the comment
- The outcome: `accepted` (code changed in response) or `dismissed` (comment resolved without code change)
- A vector embedding of `comment_text + code_context`

#### Embedding Model

- **Model:** Anthropic `voyage-3-lite` (or configurable via `EMBEDDING_MODEL` env var)
- **Dimensions:** 512
- **Why voyage-3-lite:** Good performance for code, low cost, fast inference
- **Fallback:** If embedding API is unavailable, skip memory retrieval — review still works without it

#### Initial Indexing

On app installation:
1. Fetch the last `HISTORY_DEPTH` (default: 200) merged PRs
2. For each PR, fetch review comments
3. Determine outcome per comment:
   - Get the comment's timestamp and the next commit pushed after it
   - If the file+line area changed in a subsequent commit within the same PR → `accepted`
   - If the PR was merged without changes to that area → `dismissed`
4. Embed and store each comment
5. Process in batches of 10 PRs to avoid GitHub API rate limits

#### Incremental Updates

After each PR is merged:
- Queue a job to index that PR's review comments
- Same outcome-detection logic as initial indexing
- This keeps the memory system current without re-indexing

#### Retrieval

During review:
1. Embed the current semantic diff (per-file or summarized)
2. Query pgvector: `SELECT * FROM pr_memory WHERE repository_id = $1 ORDER BY embedding <=> $2 LIMIT 5`
3. Filter results with cosine similarity > 0.75 (below this, matches are too vague to be useful)
4. Include matching comments in the AI prompt as "past feedback"

#### Cleanup

- When a repository is removed from the installation, delete its memory entries
- When `HISTORY_DEPTH` is reduced, prune entries from oldest PRs beyond the new depth
- No automatic time-based cleanup — memory is valuable and storage is cheap

### 5.5 PR Command Handler

| Command | Behavior |
|---|---|
| `@clearpr review` | Queue a manual review job (same as automatic, but triggered explicitly) |
| `@clearpr diff` | Compute semantic diff and post it as a PR comment (no AI review) |
| `@clearpr ignore <pattern>` | Add a file glob to the ignore list for this PR only (stored in Redis, keyed by PR) |
| `@clearpr config` | Reply with a comment showing: active guidelines source, severity threshold, ignored patterns, language overrides |

Commands are detected by checking if the comment body starts with `@clearpr` (case-insensitive). The command is the next word after the mention.

### 5.6 Queue Architecture (BullMQ)

#### Job Types

| Queue | Job Type | Priority | Concurrency | Description |
|---|---|---|---|---|
| `reviews` | `review-pr` | normal | 3 | Full semantic diff + AI review pipeline |
| `reviews` | `review-pr` | high | — | Manual `@clearpr review` (same queue, higher priority) |
| `commands` | `process-command` | normal | 5 | Handle @clearpr commands (diff, ignore, config) |
| `indexing` | `index-pr-history` | low | 1 | Initial bulk indexing on installation |
| `indexing` | `index-merged-pr` | normal | 2 | Incremental indexing after PR merge |

#### Retry Policy

- **Default:** 3 attempts with exponential backoff (30s, 2min, 10min)
- **GitHub API rate limit:** Delay until rate limit reset timestamp
- **Claude API rate limit:** Delay per `Retry-After` header
- **After all retries exhausted:** Move to dead-letter queue, log error

#### Dead Letter Queue

- Failed jobs are moved to `dlq:{original-queue-name}`
- Retain for 7 days
- Expose via health endpoint for monitoring
- No automatic re-processing — requires manual inspection

---

## 6. Data Model

### 6.1 Entity Relationship

```
installations 1──N repositories 1──N reviews 1──N review_comments
                                  1──N pr_memory
```

### 6.2 Tables

#### `installations`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | Internal ID |
| `github_installation_id` | bigint | UNIQUE, NOT NULL | GitHub's installation ID |
| `account_login` | varchar(255) | NOT NULL | GitHub org or user login |
| `account_type` | varchar(20) | NOT NULL | `Organization` or `User` |
| `status` | varchar(20) | NOT NULL, default `active` | `active` or `inactive` |
| `created_at` | timestamptz | NOT NULL, default now() | |
| `updated_at` | timestamptz | NOT NULL, default now() | |

#### `repositories`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK | Internal ID |
| `installation_id` | uuid | FK → installations.id, NOT NULL | |
| `github_repo_id` | bigint | UNIQUE, NOT NULL | GitHub's repo ID |
| `full_name` | varchar(255) | NOT NULL | `owner/repo` format |
| `settings` | jsonb | default `{}` | Per-repo config overrides |
| `indexing_status` | varchar(20) | default `pending` | `pending`, `in_progress`, `completed`, `failed` |
| `created_at` | timestamptz | NOT NULL, default now() | |
| `updated_at` | timestamptz | NOT NULL, default now() | |

#### `reviews`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK | Internal ID |
| `repository_id` | uuid | FK → repositories.id, NOT NULL | |
| `pr_number` | integer | NOT NULL | |
| `pr_sha` | varchar(40) | NOT NULL | Head commit SHA at review time |
| `trigger` | varchar(20) | NOT NULL | `auto`, `manual`, `rerun` |
| `status` | varchar(20) | NOT NULL | `queued`, `processing`, `completed`, `failed`, `skipped` |
| `raw_diff_lines` | integer | | Total lines in raw GitHub diff |
| `semantic_diff_lines` | integer | | Lines after semantic filtering |
| `noise_reduction_pct` | decimal(5,2) | | Percentage of noise filtered |
| `model_used` | varchar(100) | | Claude model ID used |
| `prompt_tokens` | integer | | Tokens sent to Claude |
| `completion_tokens` | integer | | Tokens received from Claude |
| `review_duration_ms` | integer | | End-to-end processing time |
| `error_message` | text | | Error details if status = failed |
| `created_at` | timestamptz | NOT NULL, default now() | |

**Index:** `(repository_id, pr_number, pr_sha)` — unique per review attempt

#### `review_comments`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK | Internal ID |
| `review_id` | uuid | FK → reviews.id, NOT NULL | |
| `file_path` | varchar(500) | NOT NULL | File the comment is on |
| `line` | integer | NOT NULL | Line number in the diff |
| `side` | varchar(5) | NOT NULL, default `RIGHT` | `LEFT` or `RIGHT` |
| `severity` | varchar(20) | NOT NULL | `critical`, `warning`, `info` |
| `body` | text | NOT NULL | Comment content (markdown) |
| `github_comment_id` | bigint | | GitHub's comment ID after posting |
| `post_status` | varchar(20) | NOT NULL, default `pending` | `pending`, `posted`, `failed` |
| `created_at` | timestamptz | NOT NULL, default now() | |

#### `pr_memory`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK | Internal ID |
| `repository_id` | uuid | FK → repositories.id, NOT NULL | |
| `pr_number` | integer | NOT NULL | Source PR number |
| `comment_author` | varchar(255) | NOT NULL | GitHub login of commenter |
| `comment_text` | text | NOT NULL | The review comment body |
| `code_context` | text | NOT NULL | File path + diff hunk surrounding the comment |
| `outcome` | varchar(20) | NOT NULL | `accepted` or `dismissed` |
| `embedding` | vector(512) | NOT NULL | voyage-3-lite embedding |
| `created_at` | timestamptz | NOT NULL, default now() | |

**Index:** `USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` on `pr_memory` partitioned by `repository_id`

#### `webhook_deliveries`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `delivery_id` | uuid | PK | GitHub's `X-GitHub-Delivery` header |
| `event` | varchar(50) | NOT NULL | Event type |
| `action` | varchar(50) | | Event action |
| `processed_at` | timestamptz | NOT NULL, default now() | |

**TTL:** Rows older than 24 hours are deleted by a scheduled cleanup job (or use Redis instead — see section 5.1).

---

## 7. API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/webhook` | HMAC-SHA256 | GitHub webhook receiver |
| `GET` | `/health` | None | Health check: app + DB + Redis + queue status |
| `GET` | `/health/ready` | None | Readiness probe (DB connected, queue workers alive) |
| `GET` | `/health/live` | None | Liveness probe (process is running) |

No admin API in v1. All configuration is via environment variables and repo-level config files.

---

## 8. GitHub App Permissions

### Required Permissions

| Permission | Access | Why |
|---|---|---|
| **Pull requests** | Read & Write | Read PR metadata/diff, post review comments |
| **Contents** | Read | Fetch file contents for AST parsing, read guideline files |
| **Metadata** | Read | Required for all GitHub Apps |
| **Issues** | Read | Read issue comments for @clearpr commands |

### Subscribed Events

| Event | Why |
|---|---|
| `pull_request` | Trigger reviews on PR open/update |
| `pull_request_review_comment` | Detect @clearpr commands in review comments |
| `issue_comment` | Detect @clearpr commands in PR comments |
| `installation` | Track app installs/uninstalls |
| `installation_repositories` | Track repo additions/removals |

---

## 9. Configuration

### 9.1 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_APP_ID` | Yes | — | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Yes | — | Path to `.pem` private key file |
| `GITHUB_WEBHOOK_SECRET` | Yes | — | HMAC secret for webhook verification |
| `ANTHROPIC_API_KEY` | Yes | — | Claude API key |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (must have pgvector extension) |
| `REDIS_URL` | Yes | — | Redis connection string |
| `REVIEW_MODEL` | No | `claude-sonnet-4-20250514` | Claude model for reviews |
| `EMBEDDING_MODEL` | No | `voyage-3-lite` | Model for generating embeddings |
| `MAX_DIFF_LINES` | No | `5000` | Skip review if semantic diff exceeds this |
| `MAX_FILE_SIZE_KB` | No | `100` | Skip tree-sitter parsing for files larger than this |
| `HISTORY_DEPTH` | No | `200` | Number of past merged PRs to index for memory |
| `REVIEW_CONCURRENCY` | No | `3` | Max concurrent review jobs |
| `SIMILARITY_THRESHOLD` | No | `0.75` | Minimum cosine similarity for memory matches |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `production` | `development` or `production` |

### 9.2 Project Config (`.reviewconfig`)

```yaml
# Guidelines — files in the repo containing coding standards
guidelines:
  - docs/coding-standards.md
  - docs/naming-conventions.md

# Minimum severity to post (findings below this are suppressed)
severity: medium  # low | medium | high | critical

# Files to exclude from review
ignore:
  - '**/*.generated.ts'
  - '**/*.min.js'
  - 'migrations/**'
  - 'vendor/**'
  - 'package-lock.json'

# Override tree-sitter language detection
languages:
  '*.tsx': typescript
  '*.blade.php': php
  '*.mdx': markdown
```

---

## 10. Security Requirements

### 10.1 Webhook Security

- HMAC-SHA256 verification on every request (reject-first approach)
- No request body parsing before signature validation
- Constant-time comparison for signature matching (prevent timing attacks)
- Log rejected attempts without exposing request body

### 10.2 GitHub Token Management

- Use GitHub App installation tokens (not personal access tokens)
- Tokens expire after 1 hour — refresh proactively when < 10 minutes remaining
- Cache tokens in Redis with TTL matching expiry
- Never log tokens — even at debug level

### 10.3 Multi-Tenancy Isolation

- All database queries scoped by `installation_id` or `repository_id`
- No cross-installation data access (enforced at query level, not just API level)
- Memory retrieval scoped to the repository being reviewed
- Queue jobs tagged with installation_id for audit trail

### 10.4 AI Prompt Injection Prevention

- PR titles, branch names, and commit messages are included in prompts — sanitize them:
  - Strip any content that looks like prompt injection (`ignore previous instructions`, `system:`, etc.)
  - Wrap all user-provided content in XML-like delimiters in the prompt
  - Limit each user-provided field to reasonable length (title: 200 chars, body: 5000 chars)
- Review comment output from Claude is posted as-is (markdown) — but validate it doesn't contain HTML `<script>` tags (GitHub sanitizes, but defense in depth)

### 10.5 Data Privacy

- Source code is processed in memory and never persisted to disk or database
- Only review comments and their surrounding context (small diff hunks) are stored
- No telemetry or analytics data sent externally
- All data stays within the self-hosted deployment

---

## 11. Non-Functional Requirements

### 11.1 Performance

| Metric | Target |
|---|---|
| Review latency (< 500 semantic diff lines) | < 60 seconds end-to-end |
| Review latency (500–2000 semantic diff lines) | < 120 seconds |
| Semantic diff computation (per file) | < 2 seconds |
| Webhook acknowledgment | < 500ms (queue the job, return 200) |

### 11.2 Scalability

| Dimension | v1.0 Target |
|---|---|
| Concurrent review jobs | 3–10 per instance (configurable) |
| Webhook burst capacity | 100+ queued without data loss (Redis-backed queue) |
| Installations per instance | 50+ organizations |
| PR memory entries per repo | 10,000+ (pgvector handles millions) |

### 11.3 Reliability

- Queue jobs survive process restarts (Redis persistence)
- Failed reviews don't block subsequent PRs
- GitHub API rate limits are respected and backed off gracefully
- Health endpoint enables container orchestrator restarts on failure

### 11.4 Observability

- **Structured JSON logging** (pino or nestjs-pino) with correlation IDs per webhook delivery
- **Metrics** exposed via health endpoint:
  - Queue depth per queue
  - Jobs processed / failed in last hour
  - Average review duration
  - GitHub API rate limit remaining
- **No external monitoring dependencies in v1** — logs to stdout for Docker

### 11.5 Resource Footprint

| Resource | Idle | Under Load |
|---|---|---|
| Memory (app) | ~128MB | < 512MB |
| Memory (worker) | ~128MB | < 1GB (tree-sitter parsing) |
| CPU | Minimal | 2–4 cores during parsing |
| Disk | < 1GB (DB + app) | Grows with PR memory (~1KB per entry) |

---

## 12. Deployment Architecture

### 12.1 Docker Compose (v1.0)

```yaml
services:
  app:          # NestJS API + webhook handler
  worker:       # BullMQ worker (can be same process or separate)
  db:           # PostgreSQL 16 with pgvector extension
  redis:        # Redis 7 for queues + caching
```

### 12.2 Networking

- **Inbound:** HTTPS on port 443 (reverse proxy handles TLS termination)
- **Internal:** App ↔ DB (port 5432), App ↔ Redis (port 6379)
- **Outbound:** GitHub API (api.github.com), Anthropic API (api.anthropic.com)
- No sticky sessions needed — app is stateless, all state in DB/Redis

### 12.3 Reverse Proxy

ClearPR does not handle TLS. Deploy behind one of:
- nginx / Caddy (self-hosted)
- Cloud load balancer (AWS ALB, GCP LB)
- Cloudflare Tunnel (zero-config HTTPS)

### 12.4 Optional: Separate Worker Process

For higher-load deployments, the BullMQ worker can run as a separate container:
- `app` container: handles webhooks, serves API, enqueues jobs
- `worker` container: processes review/indexing jobs from the queue
- Scale workers independently based on queue depth

---

## 13. Error Handling Matrix

| Component | Failure | Impact | Response |
|---|---|---|---|
| Webhook handler | Invalid signature | None (attacker) | Return 401, log source IP |
| Webhook handler | Duplicate delivery | None | Return 200, skip processing |
| Diff engine | tree-sitter crash | Degraded diff quality | Fall back to whitespace filter, log warning |
| Diff engine | GitHub API error fetching files | Review blocked | Retry 3x, then fail job |
| AI review | Claude API timeout | Review delayed | Retry 2x, then post "Review unavailable" |
| AI review | Claude API 429 | Review delayed | Re-queue with delay from Retry-After |
| AI review | Malformed response | Partial review | Retry once, then post raw response |
| Memory system | Embedding API down | Missing memory context | Skip memory, proceed with review |
| Memory system | pgvector query slow | Review delayed | Timeout at 5s, skip memory for this review |
| GitHub posting | Comment API failure | Review not visible | Retry 3x, log failure, mark review as `posted_partially` |
| GitHub posting | PR closed before posting | Wasted work | Detect before posting, skip gracefully |

---

## 14. Milestones

### Milestone 1: Foundation
- NestJS project scaffold with TypeScript strict mode
- Docker Compose with PostgreSQL (pgvector) + Redis
- Health check endpoint
- GitHub App webhook handler with HMAC verification
- Idempotency via delivery ID tracking

### Milestone 2: Diff Engine
- tree-sitter integration for TypeScript/JavaScript
- AST normalization and semantic diff computation
- Whitespace-only fallback for unsupported languages
- `@clearpr diff` command

### Milestone 3: AI Review
- Claude API integration
- Project guideline loading (claude.md, agent.md, .reviewconfig)
- Prompt construction with token budget management
- Review posting as inline comments + summary
- `@clearpr review` command

### Milestone 4: Memory System
- pgvector setup and embedding pipeline
- Initial PR history indexing on install
- Incremental indexing on PR merge
- Memory retrieval during review
- Outcome detection (accepted vs dismissed)

### Milestone 5: Polish & Hardening
- Queue monitoring and dead-letter handling
- Rate limit handling for GitHub and Claude APIs
- `@clearpr ignore` and `@clearpr config` commands
- Structured logging with correlation IDs
- Documentation and .env.example

---

## 15. Open Questions

These should be resolved during architecture design:

1. **Single process vs separate worker?** — Start with single process for simplicity, document the separation path for scale. Decision: defer to architecture.

2. **Embedding model self-hosted?** — voyage-3-lite requires API calls. Could use a local model (e.g., `all-MiniLM-L6-v2`) to eliminate the external dependency. Trade-off: quality vs self-containment.

3. **Review de-duplication on rapid pushes** — If a developer pushes 3 commits in 30 seconds, we get 3 `synchronize` events. Should we debounce? Proposed: 30-second debounce window per PR in the queue — only the latest SHA gets reviewed.

4. **Caching tree-sitter ASTs** — Parsing the base version of a file is repeated across pushes to the same PR. Cache base ASTs by `(repo_id, file_path, base_sha)` in Redis? Trade-off: memory vs CPU.

5. **Guidelines versioning** — If guidelines change between the PR open and a re-review, which version should be used? Proposed: always use guidelines from the PR's base branch HEAD.

6. **Maximum PR size** — Beyond `MAX_DIFF_LINES`, should we refuse entirely or review a subset of files? Current design: skip and post a comment. Could alternatively review the N most-changed files.

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **Semantic diff** | A diff that only contains changes affecting code behavior, with formatting changes removed |
| **AST** | Abstract Syntax Tree — a tree representation of code structure |
| **tree-sitter** | An incremental parsing library that can parse code into ASTs for 100+ languages |
| **pgvector** | PostgreSQL extension for vector similarity search |
| **Installation** | A GitHub App installation — one org or user account that has installed the app |
| **Installation token** | A short-lived (1 hour) token scoped to a specific installation's repositories |
| **Delivery ID** | A unique UUID assigned by GitHub to each webhook delivery |
| **BullMQ** | A Redis-based job queue library for Node.js |
| **Clean diff** | Synonym for semantic diff |
| **Noise** | Formatting-only changes in a diff that don't affect code behavior |
