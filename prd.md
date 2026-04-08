# ClearPR — Product Requirements Document

**Intelligent GitHub PR Review System**

Semantic Diff Filtering | AI-Powered Review | Past PR Memory

---

**Version:** 1.1
**Date:** April 2026
**Author:** Vineeth N K
**Status:** Draft

---

## 1. Executive Summary

ClearPR is a self-hosted GitHub App that transforms the pull request review experience by solving three critical problems that plague development teams: formatting noise in diffs, stateless AI reviews, and lack of institutional memory in code review.

Unlike existing tools that pass raw, noisy diffs to an LLM and hope for the best, ClearPR preprocesses diffs at the AST level to strip formatting-only changes, reviews code against project-specific guidelines, and learns from past PR feedback to catch repeat mistakes. The result is a focused, noise-free, context-aware review that gets smarter over time.

### 1.1 Product Vision

Every PR review should show only what actually changed, enforce team standards automatically, and remember what the team has already learned.

### 1.2 Key Value Propositions

- **Semantic Diff Filtering:** Strip prettier/formatter noise, whitespace changes, and import reordering before review. Reviewers see only real code changes.
- **Project-Aware AI Review:** Read project guidelines from `claude.md`, `agent.md`, or `.reviewconfig` and enforce them automatically. No generic advice.
- **Past PR Memory:** Index historical review comments and learn from past mistakes. Flag repeat patterns and regressions that human reviewers would miss.

---

## 2. Problem Statement

### 2.1 The Formatting Noise Problem

Modern codebases use automated formatters like Prettier, ESLint, and Black. When these tools reformat code as part of a PR, the diff balloons with thousands of lines of whitespace, line-wrapping, and import reordering changes that have zero functional impact. A PR with 50 lines of real changes can appear as 20,000+ lines of diff.

GitHub's built-in "Hide whitespace" toggle (or `?w=1` URL parameter) only handles literal whitespace changes. It does not handle prettier-style reformats like line wrapping, trailing comma additions, quote style changes, or import reordering. Developers are forced to manually scan massive diffs to find the actual code changes.

### 2.2 The Stateless Review Problem

Existing AI code review tools (Claude Code Review, GitHub Copilot, CodeRabbit, Gito) treat every PR as a blank slate. They have no memory of past reviews, accepted patterns, or recurring issues. This means:

- The same mistake gets flagged differently each time (inconsistency)
- Previously accepted patterns get flagged again (noise)
- Team-specific conventions are not learned (generic feedback)
- Repeat offenders get no escalated attention (no learning curve)

### 2.3 The Context Gap

Most AI reviewers apply generic rules. They do not know that your team uses a specific error handling pattern, that a certain module has special naming conventions, or that a particular API endpoint needs extra validation. Without project context, reviews produce high false-positive rates and low-value suggestions.

---

## 3. Target Users

### 3.1 Primary: Small to Mid-size Development Teams (5–30 developers)

- Teams using GitHub for version control and PRs
- Codebases with automated formatters (Prettier, ESLint, Black, etc.)
- Teams with established coding guidelines that are hard to enforce manually
- Tech leads and senior developers who spend significant time on code review

### 3.2 Secondary: Open Source Maintainers

- Maintainers reviewing external contributions with varying code quality
- Projects that need consistent enforcement of contribution guidelines

---

## 4. Competitive Landscape

| Tool | Semantic Diff | AI Review | Past PR Memory | Project Rules | Self-Hosted |
|------|:---:|:---:|:---:|:---:|:---:|
| **ClearPR** | **Yes (AST)** | **Yes** | **Yes** | **Yes** | **Yes** |
| Claude Code Review | No | Yes | No | CLAUDE.md | No |
| Qodo (PR-Agent) | No | Yes | Yes | Yes | Partial |
| GitHub Copilot | No | Yes | No | Custom Instr. | No |
| DiffLens | Yes (AST) | No | No | No | No |
| Gito / ai-review | No | Yes | No | Config file | Yes |

### 4.1 Key Differentiator

ClearPR is the only self-hosted tool that combines all three: semantic diff filtering, AI review with project-specific rules, and learning from past PR history. Qodo offers past PR memory but is enterprise SaaS (recently raised $70M Series B) and not self-hostable. DiffLens does AST-based diffs but has no AI review. No existing tool preprocesses diffs before sending to AI, which wastes tokens and increases hallucination risk.

---

## 5. Feature Specification

### 5.1 Phase 1: Semantic Diff Engine + AI Review (Weeks 1–4)

#### 5.1.1 Semantic Diff Filtering

The core preprocessing layer that strips non-functional changes from PR diffs before they reach the AI reviewer or the developer.

**What gets filtered:**

- Whitespace and indentation changes (spaces, tabs, blank lines)
- Prettier/formatter-induced rewraps (line length changes)
- Trailing comma additions/removals
- Quote style changes (single to double quotes and vice versa)
- Import reordering (same imports, different order)
- Semicolon additions/removals (where language allows)

**How it works:**

1. Receive PR webhook from GitHub with diff payload
2. For each changed file, parse both old and new versions into AST using tree-sitter
3. Compare ASTs to identify semantic changes vs formatting changes
4. Generate a clean diff containing only semantic changes
5. Pass the clean diff to AI review and/or post as a PR comment

**Language support (MVP — JS/TS only, see section 5.4 for rationale):**

- TypeScript / JavaScript (primary, fully AST-based)
- JSON / YAML (structural comparison, no AST needed)
- All other languages: whitespace-only filtering as fallback

**Critical invariant:** ClearPR must **never hide a real change**. If the diff engine is unsure whether a change is semantic or cosmetic, it must include it. False negatives (hiding real changes) are unacceptable. False positives (showing formatting changes) are tolerable. See section 8 for testing strategy.

#### 5.1.2 AI-Powered Code Review

Context-aware code review powered by Anthropic Claude API, using project-specific guidelines.

**Configuration hierarchy (checked in order):**

1. `claude.md` in repository root
2. `agent.md` in repository root
3. `.reviewconfig` file in repository root (YAML format)

**`.reviewconfig` format:**

```yaml
guidelines:
  - docs/coding-standards.md
    - docs/naming-conventions.md
      - docs/api-patterns.md
      severity: medium  # minimum severity to report
      ignore:
        - '**/*.generated.ts'
          - 'migrations/**'
          ```

          **Review output:**

          - Inline comments on specific lines with severity tags (Critical, High, Medium, Low)
          - PR summary comment with overview of findings
          - Chunk-based review: related changes grouped into logical sections for clarity
          - No approval/blocking: findings are advisory, not gatekeeping

          ---

          ### 5.2 Phase 2: Past PR Memory (Weeks 5–7)

          #### 5.2.1 PR History Indexing

          **On install:**

          - Scan the last 200 merged PRs via GitHub API (paginated, rate-limit-aware — see section 7)
          - Extract all review comments (human and bot)
          - Generate vector embeddings for each comment with metadata
          - Store in PostgreSQL with pgvector extension

          **Cold-start handling (repos with limited history):**

          - If a repo has fewer than 20 merged PRs with review comments, ClearPR skips the memory feature and operates in "learning mode" — silently indexing new reviews without querying for past patterns
          - Memory-based review activates automatically once the index reaches 50+ review comments
          - New repos get a status message: *"ClearPR is learning your team's patterns. Memory-based suggestions will activate after ~50 review comments are indexed."*
          - The `HISTORY_DEPTH` env var controls how many past PRs to scan (default: 200, minimum: 0 to disable)

          **Metadata per comment:**

          - File path and line range
          - Comment author and timestamp
          - Pattern type (bug, style, security, performance, convention)
          - Resolution status (code changed = accepted, dismissed = ignored)
          - PR author (who made the mistake)

          #### 5.2.2 Contextual Memory During Review

          When a new PR is submitted, ClearPR queries the vector database to find relevant past feedback:

          - Same file or module flagged before? Surface the history.
          - Same developer repeating a known mistake? Reference the previous PR.
          - Similar code pattern that caused an incident? Warn proactively.
          - Previously accepted pattern being flagged again? Suppress the false alarm.

          Past context is injected into the AI review prompt so Claude can say: *"This is similar to the issue found in PR #342 where the error handling was missing for OAuth callbacks."*

          #### 5.2.3 Learning Loop

          - When a review comment leads to a code change: mark as accepted, increase weight
          - When a comment is dismissed or ignored: decrease weight over time
          - Periodically recalculate pattern weights to reduce stale signals
          - Track per-developer mistake patterns (not for blame, but for targeted guidance)

          ---

          ### 5.3 Phase 3: Advanced Features (Future)

          - Auto-fix suggestions with one-click apply via GitHub suggested changes
          - Team analytics dashboard (common issues, review velocity, improvement trends)
          - Multi-repository support with shared guidelines
          - Slack/Teams notifications for critical findings
          - Custom LLM provider support (OpenAI, Ollama, local models)
          - IDE plugin for pre-push local review
          - PHP language support (AST-based, after JS/TS is stable)

          ---

          ### 5.4 Multi-Language AST Strategy

          **Why JS/TS only for Phase 1:**

          Each language needs custom logic for "what counts as formatting vs semantic change." Prettier rewraps JavaScript differently than Black reformats Python. Import ordering rules differ across ecosystems. Trailing comma significance varies by language. This per-language tuning is significant ongoing work.

          **Per-language effort estimate:**

          | Language | Formatting Rules | tree-sitter Quality | Estimated Effort | Phase |
          |----------|:---:|:---:|:---:|:---:|
          | TypeScript / JavaScript | Well-defined (Prettier is dominant) | Excellent | 2 weeks | Phase 1 |
          | PHP | Moderate (PSR-12, PHP-CS-Fixer) | Good | 1 week | Phase 3 |
          | Python | Well-defined (Black) | Excellent | 1 week | Future |
          | Go | Minimal (gofmt is idempotent) | Excellent | 3 days | Future |
          | Java | Complex (multiple formatters) | Good | 1.5 weeks | Future |

          **Strategy:** Ship JS/TS with high quality. Add languages based on user demand. Each new language is a self-contained module with its own test suite. Community contributors can add language support via a well-defined interface.

          **Fallback behavior:** For unsupported languages, ClearPR applies whitespace-only filtering (`git diff -w` equivalent). This still removes indentation and blank line noise — just not formatter-specific changes like line rewraps or comma additions. The review summary clearly labels which files got AST-based filtering vs whitespace-only.

          ---

          ## 6. Technical Architecture

          ### 6.1 System Components

          | Component | Technology | Purpose |
          |-----------|-----------|---------|
          | API Server | NestJS (TypeScript) | Webhook handler, review orchestration, REST API |
          | Database | PostgreSQL + pgvector | PR history, embeddings, config, review results |
          | Diff Engine | tree-sitter (multi-lang) | AST parsing and semantic diff generation |
          | AI Review | Anthropic Claude API | Code analysis against project guidelines |
          | Queue | BullMQ + Redis | Async job processing for PR reviews |
          | Deployment | Docker Compose | Self-hosted, single `docker-compose up` |

          ### 6.2 Data Flow

          1. GitHub sends PR webhook (`opened`, `synchronize`, `reopened`) to ClearPR API
          2. API validates webhook signature, enqueues a review job in BullMQ
          3. Worker fetches full diff and file contents via GitHub API (rate-limit-aware — see section 7)
          4. Semantic Diff Engine parses files with tree-sitter, strips formatting noise
          5. If AST parsing fails for a file, fallback to whitespace-only filtering (see section 9)
          6. Clean diff is chunked into logical sections (by function, class, or module)
          7. Worker reads project guidelines (`claude.md` / `agent.md` / `.reviewconfig`)
          8. Worker queries pgvector for relevant past PR feedback on affected files
          9. Secret scrubbing applied to diff before sending to Claude (see section 10.2)
          10. Clean diff + guidelines + past context sent to Claude API for review (with retry — see section 9)
          11. Review results posted as inline comments and summary on GitHub PR
          12. New review comments indexed back into pgvector for future learning

          ### 6.3 GitHub App Permissions

          | Permission | Access | Reason |
          |-----------|--------|--------|
          | Pull Requests | Read/Write | Read PR diffs, post review comments |
          | Contents | Read | Read guideline files, source code for AST parsing |
          | Metadata | Read | Repository info, branch data |
          | Issues | Read | Link review findings to related issues (future) |

          ### 6.4 Webhook Events

          - `pull_request.opened` — Trigger full review
          - `pull_request.synchronize` — Re-review on new commits (debounced, 30s window)
          - `pull_request.reopened` — Re-review
          - `pull_request_review_comment.created` — Index human feedback for learning
          - `issue_comment.created` — Respond to `@clearpr` commands

          ---

          ## 7. Rate Limiting & Scale

          ### 7.1 GitHub API Rate Limits

          GitHub Apps get 5,000 requests/hour per installation. ClearPR must respect this.

          **Per-review API cost:**

          | Operation | API Calls | Notes |
          |-----------|:---------:|-------|
          | Fetch PR metadata | 1 | GET /pulls/:id |
          | Fetch changed files list | 1 | GET /pulls/:id/files (paginated, 100/page) |
          | Fetch file contents (old + new) | 2 per file | GET /repos/:owner/:repo/contents (or git blob API) |
          | Read config files | 1–4 | claude.md, agent.md, .reviewconfig, guideline files |
          | Post review comments | 1–10 | POST /pulls/:id/reviews |
          | **Total per small PR (10 files)** | **~25** | Well within limits |
          | **Total per large PR (100 files)** | **~210** | Still fine for hourly limit |

          **History indexing (Phase 2, on install):**

          - 200 PRs × ~3 calls each = ~600 calls
          - Spread over 10 minutes with 1-second delays between pages
          - If rate limit is hit, pause and resume with `X-RateLimit-Reset` header
          - Background job, does not block webhook processing

          **Burst protection:**

          - If 10 PRs arrive within 5 minutes, BullMQ processes them sequentially per repo
          - Cross-repo reviews can run in parallel (separate GitHub API rate limits per installation)
          - `REVIEW_CONCURRENCY` env var controls max parallel workers (default: 3)

          ### 7.2 Claude API Rate Limits

          Anthropic rate limits vary by tier. ClearPR handles this with:

          - Exponential backoff on 429 responses (1s, 2s, 4s, 8s, max 60s)
          - Maximum 3 retries before marking review as failed
          - Queue priority: manual `@clearpr review` requests get higher priority than auto-reviews
          - `CLAUDE_MAX_RETRIES` and `CLAUDE_RETRY_DELAY_MS` env vars for tuning

          ### 7.3 Webhook Debouncing

          When a developer pushes multiple commits quickly, GitHub fires a `synchronize` event for each push. ClearPR debounces these:

          - On receiving `synchronize`, start a 30-second timer
          - If another `synchronize` arrives for the same PR within 30 seconds, reset the timer
          - Only process the review after 30 seconds of quiet
          - Cancel any in-progress review for the same PR if a new push arrives
          - `DEBOUNCE_SECONDS` env var (default: 30)

          ---

          ## 8. Testing & Validation Strategy

          ### 8.1 Diff Engine Correctness

          The semantic diff engine is the highest-risk component. A bug here could silently hide real code changes from reviewers. This requires dedicated testing.

          **Core invariant:** If a code change affects runtime behavior, it must appear in the clean diff. ClearPR may show extra formatting changes (false positives), but it must never hide real changes (false negatives).

          **Test approach:**

          **Golden test suite (automated, runs on every CI build):**

          - A curated set of 100+ file pairs (before/after) with known semantic and formatting changes
          - Each test case specifies: input files, expected "real changes," expected "filtered changes"
          - Test runner verifies that all expected real changes appear in the clean diff
          - Test runner verifies that expected formatting changes are stripped
          - Test cases organized by language and change type:
            - `tests/golden/js/prettier-rewrap.test.ts` — line rewrapping
              - `tests/golden/js/import-reorder.test.ts` — import sorting
                - `tests/golden/js/trailing-comma.test.ts` — comma additions
                  - `tests/golden/js/real-change-mixed.test.ts` — real changes mixed with formatting
                    - `tests/golden/js/edge-case-template-literal.test.ts` — template literal changes

                    **Mutation testing:**

                    - Take a file, make a small semantic change (rename variable, change condition, add parameter)
                    - Run Prettier on the result
                    - Verify ClearPR's clean diff includes the semantic change
                    - Automate this with a script that generates N random mutations per file

                    **Real-world regression tests:**

                    - Collect actual PRs from open-source repos that had Prettier runs mixed with real changes
                    - Manually label which changes are semantic vs formatting
                    - Run ClearPR against them and compare output to labels
                    - Add any failures as new golden test cases

                    **Confidence reporting:**

                    - Each file in the review gets a tag: `[AST-filtered]` or `[whitespace-only]`
                    - If tree-sitter parsing fails, the file is tagged `[unfiltered — parse error]`
                    - The summary comment reports: "Filtered 847 formatting-only changes across 12 files. 3 files used whitespace-only fallback."

                    ### 8.2 AI Review Quality

                    - Maintain a set of 20+ "known bad" code samples with expected findings
                    - Run reviews against them monthly and track detection rates
                    - Log all review comments with accept/dismiss outcomes for ongoing accuracy measurement
                    - A/B test prompt changes against the golden set before deploying

                    ### 8.3 Integration Testing

                    - End-to-end tests using a dedicated GitHub test repository
                    - CI creates a PR with known changes, ClearPR reviews it, test validates the posted comments
                    - Tests cover: webhook delivery, diff filtering, comment posting, rate limit handling, error recovery

                    ---

                    ## 9. Error Handling & Failure Modes

                    ### 9.1 Degradation Strategy

                    ClearPR uses a layered degradation approach. When a component fails, the system falls back to the next layer rather than failing silently.

                    | Failure | User Impact | Behavior |
                    |---------|-------------|----------|
                    | tree-sitter parse error (single file) | One file not AST-filtered | Fallback to whitespace-only diff for that file. Tag as `[whitespace-only — parse error]`. Other files still get AST filtering. |
                    | tree-sitter parse error (all files) | No AST filtering | Full review runs on whitespace-filtered diff. Summary notes: "AST parsing unavailable, using whitespace filtering." |
                    | Claude API down or 5xx | No AI review | Post a comment: "ClearPR: AI review unavailable. Semantic diff is posted below." Post the clean diff without AI analysis. Retry the AI review in 5 minutes (max 3 retries). |
                    | Claude API rate limited (429) | Review delayed | Exponential backoff. Comment: "ClearPR: Review queued, will complete shortly." |
                    | Claude API returns nonsensical review | Bad review quality | Validate response structure before posting. If review has 0 findings on a large diff, flag internally for manual inspection. Never post raw API errors to the PR. |
                    | GitHub API rate limited | Review delayed | Pause processing, resume after `X-RateLimit-Reset`. Queue holds pending jobs. |
                    | GitHub webhook delivery fails | Review missed | GitHub retries webhooks automatically. ClearPR deduplicates by PR number + commit SHA. |
                    | PostgreSQL down | No memory features | Review runs without past PR context. Log the error. Memory features resume when DB recovers. |
                    | Redis down | No job queue | Webhook handler returns 503. GitHub retries. Alert via logs. |
                    | Guideline files not found | No project context | Review runs with ge