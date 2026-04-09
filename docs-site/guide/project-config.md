# Project Config

ClearPR reads project-specific guidelines to make reviews context-aware.

## Config File Priority

ClearPR checks for config files in this order (first found wins):

1. `claude.md` in repo root
2. `agent.md` in repo root
3. `.reviewconfig` in repo root

## Simple: `claude.md` or `agent.md`

Write your coding guidelines directly in markdown. ClearPR reads the full file and uses it as review context.

```markdown
# Coding Standards

## TypeScript
- Use early return over nested if/else
- No `any` types — use `unknown` if needed
- Booleans start with `is`, `has`, `can`, `should`

## Error Handling
- Always handle promise rejections
- Use custom error classes for domain errors
- Never swallow errors silently in catch blocks
```

## Advanced: `.reviewconfig`

For more control, use a `.reviewconfig` YAML file:

```yaml
# Point to multiple guideline files
guidelines:
  - docs/coding-standards.md
  - docs/naming-conventions.md
  - docs/error-handling.md

# Minimum severity to post (findings below this are suppressed)
# Options: low | medium | high | critical
severity: medium

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

## No Config

If no config file is found, ClearPR still works — it runs the AI review without project-specific guidelines. The review will be more generic but still useful.

## Supported Languages

| Language | Diff Filtering | Strategy |
|----------|:-:|---|
| TypeScript / JavaScript | AST-based | Strips quotes, semicolons, trailing commas, import order |
| PHP | AST-based | Strips quotes, trailing commas, use statement order |
| JSON | Structural | Key-sorted comparison, ignores whitespace |
| YAML | Structural | Value comparison, ignores comments and quoting |
| Other | Whitespace-only | Strips leading/trailing whitespace, collapses blank lines |
