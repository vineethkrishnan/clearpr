# Why ClearPR?

## The Problem Nobody Talks About

Every team has this workflow:

1. Developer finishes a feature
2. Runs `npx prettier --write .` before committing
3. Opens a PR
4. PR shows **20,847 lines changed**
5. Reviewer panics, scrolls for 10 minutes, gives up
6. Approves with "LGTM" and hopes for the best

The real change? **47 lines.** But they're buried in 20,000 lines of Prettier formatting.

GitHub's "Hide whitespace" toggle doesn't help because Prettier changes more than whitespace:

| What Prettier Does | "Hide whitespace" catches it? |
|---|---|
| Rewraps lines at 80 chars | No |
| Changes `'` to `"` | No |
| Adds trailing commas | No |
| Reorders imports | No |
| Adds/removes semicolons | No |
| Changes indentation | Yes (only this one) |

**5 out of 6 common Prettier changes slip through GitHub's filter.**

## The Real Diff

Here's what ClearPR shows instead of 20K lines of noise:

![Semantic Diff Comparison](/images/diff-comparison.png)

## What Existing Tools Miss

### GitHub Copilot PR Review

- Reviews the **raw diff** — all 20K lines
- Burns tokens on formatting noise
- Generic advice not tied to your team's rules
- No memory of past reviews

### CodeRabbit

- SaaS only — your code leaves your network
- No semantic diff filtering
- No team-specific guideline loading
- No learning from past PR feedback

### Graphite / Reviewbot

- Focused on workflow, not review quality
- No AST-based diff filtering
- No formatting noise removal

### Manual AI Review (paste diff into ChatGPT)

- Manual process, not automated
- No integration with GitHub
- No project context or guidelines
- Entire raw diff = wasted tokens and poor focus

## What ClearPR Does Differently

| Feature | Copilot | CodeRabbit | ClearPR |
|---|:-:|:-:|:-:|
| Strips formatting noise (AST) | - | - | Yes |
| Self-hosted / private | - | - | Yes |
| Your project's guidelines | - | - | Yes |
| Learns from past reviews | - | - | Yes |
| Multi-LLM provider | - | - | Yes |
| Token-efficient | - | - | Yes |
| Advisory only (never blocks) | Yes | Yes | Yes |

## Sample Review Output

When ClearPR reviews a PR, it posts:

### Inline Comments

![Inline Comment Example](/images/inline-comment.png)

### Summary Comment

![Review Summary](/images/review-summary.png)

The summary shows:
- **Diff stats** — how many lines were noise vs real changes
- **Findings** grouped by severity (critical, warning, info)
- **Details table** with file, line, and issue description
- Whether guidelines and past feedback were used

## The Math: Token Savings

By filtering formatting noise **before** sending to the LLM:

| PR Size | Raw Tokens | ClearPR Tokens | Monthly Cost (team of 10) |
|---|:-:|:-:|:-:|
| Small (50 lines) | ~2,000 | ~1,500 | - |
| Medium + formatter | ~15,000 | ~4,000 | - |
| Large + prettier | ~80,000 | ~8,000 | - |
| **Total (200 PRs/mo)** | **~$80-220** | **~$25-60** | **60-73% savings** |

## Who Should Use ClearPR

- **Teams running Prettier/ESLint** — the #1 source of noisy diffs
- **Teams with documented coding standards** — ClearPR enforces them
- **Security-conscious orgs** — self-hosted, no code leaves your network
- **Cost-conscious teams** — dramatically reduces LLM token usage
- **Anyone tired of scrolling** through 20K-line PRs to find 47 real changes
