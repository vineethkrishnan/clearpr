# PR Commands

Comment on any PR to interact with ClearPR:

| Command | What it does |
|---------|-------------|
| `@clearpr review` | Trigger a manual review |
| `@clearpr diff` | Post the clean semantic diff as a comment |
| `@clearpr ignore [pattern]` | Ignore a file pattern for this PR |
| `@clearpr config` | Show active config for this repo |

## `@clearpr review`

Triggers a manual review, same as automatic review on PR open. Useful when:
- You've pushed fixes and want a re-review
- The automatic review was skipped (e.g., diff too large)

Manual reviews get **higher priority** in the queue.

## `@clearpr diff`

Posts the semantic diff as a PR comment — shows only the lines that changed in behavior, with all formatting noise removed. No AI review is run.

## `@clearpr ignore [pattern]`

Adds a file glob pattern to the ignore list for this PR only. Example:

```
@clearpr ignore **/*.generated.ts
```

Ignored files are excluded from the semantic diff and AI review.

## `@clearpr config`

Posts a comment showing the active configuration for this repo:
- Guidelines source (claude.md, agent.md, or .reviewconfig)
- Severity threshold
- Ignored file patterns
- Language overrides
