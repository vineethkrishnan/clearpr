# PR Commands

Comment on any PR to interact with ClearPR:

| Command | What it does |
|---------|-------------|
| `@clearpr review` | Trigger a manual review |
| `@clearpr diff` | Post the clean semantic diff as a comment |
| `@clearpr ignore [pattern]` | Ignore a file pattern for this PR |
| `@clearpr config` | Show active config for this repo |

Commands are case-insensitive. The command word must immediately follow the `@clearpr` mention.

## `@clearpr review`

Triggers a manual review, same as automatic review on PR open. Useful when:
- You've pushed fixes and want a re-review
- The automatic review was skipped (e.g., diff too large)

Manual reviews get **higher priority** in the queue.

## `@clearpr diff`

Posts the semantic diff as a PR comment — shows only the lines that changed in behavior, with all formatting noise removed. No AI review is run.

The diff comment includes:
- Raw → semantic line counts with noise-reduction percentage
- Per-file breakdown with strategy used (AST or whitespace fallback)
- Any active ignore patterns that were applied

Files matching active ignore patterns are excluded from the diff.

## `@clearpr ignore [pattern]`

Adds a file glob pattern to the ignore list for **this PR only**. Example:

```
@clearpr ignore **/*.generated.ts
@clearpr ignore vendor/**
```

Ignored files are excluded from both the semantic diff and AI review.

**Behavior:**
- Patterns are stored in Redis with a **30-day TTL** (auto-cleaned after the PR goes stale)
- Maximum **50 patterns per PR** to prevent unbounded growth
- Supports standard glob syntax: `*` (single segment), `**` (recursive), `?` (single char)
- ClearPR confirms the addition with a comment listing all active patterns

## `@clearpr config`

Posts a comment showing the active configuration:

| Field | Description |
|-------|-------------|
| **LLM provider** | Active provider and model (e.g., `anthropic` / `claude-sonnet-4-20250514`) |
| **Max semantic diff lines** | Review is skipped if the semantic diff exceeds this |
| **Max file size** | Files larger than this skip AST parsing and use whitespace fallback |
| **Review concurrency** | Max parallel review jobs |
| **Memory similarity threshold** | Minimum cosine similarity for past feedback matches |
| **Guidelines** | Whether guidelines were found in the repo (`claude.md`, `agent.md`, or `.reviewconfig`) |
| **Ignore patterns** | Per-PR ignore patterns currently active (from `@clearpr ignore`) |
