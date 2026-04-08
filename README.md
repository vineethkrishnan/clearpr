# ClearPR

**Your PR has 50 real changes buried under 20,000 lines of Prettier formatting. ClearPR fixes that.**

ClearPR is a self-hosted GitHub App that strips formatting noise from diffs, reviews code against your project guidelines, and learns from past PR feedback to catch repeat mistakes.

---

## The Problem

You open a PR. It says **20,847 lines changed**. You panic. Then you realize — someone ran Prettier. The actual code change? 47 lines. But GitHub shows you all 20,847. The "Hide whitespace" toggle doesn't help because Prettier doesn't just change whitespace — it rewraps lines, adds trailing commas, reorders imports, changes quote styles.

So you spend the next hour scrolling, squinting, trying to find the real changes. Or you just approve it and hope for the best.

ClearPR fixes this. It parses your code into an AST, strips everything that doesn't change behavior, and shows you only what actually matters. Then it reviews that clean diff using AI with your project's own rules. And it remembers what your team got wrong before, so the same mistake doesn't slip through twice.

---

## Features

### Semantic Diff Filtering

ClearPR uses [tree-sitter](https://tree-sitter.github.io/tree-sitter/) to parse your code into an Abstract Syntax Tree and compare the actual structure — not the text. This strips out:

- Whitespace and indentation changes
- Prettier/formatter line rewraps
- Trailing comma additions/removals
- Quote style changes (`'` to `"` and back)
- Import reordering (same imports, different order)
- Semicolon additions/removals

What's left is the real diff — the code that actually changed in behavior.

### AI-Powered Review with Project Context

ClearPR reads your project's guidelines and reviews code against them. Not generic "you should add error handling" advice — specific, rule-based feedback tied to how your team writes code.

It looks for config in this order:

1. `claude.md` in repo root
2. `agent.md` in repo root
3. `.reviewconfig` in repo root (points to multiple guideline files)

```yaml
# .reviewconfig
guidelines:
  - docs/coding-standards.md
    - docs/naming-conventions.md
      - docs/api-patterns.md
      severity: medium
      ignore:
        - '**/*.generated.ts'
          - 'migrations/**'
          ```

          ### Past PR Memory

          ClearPR indexes your team's review history. When someone makes a mistake that was caught before, ClearPR flags it with context:

          > *"This is similar to the issue found in PR #342 where error handling was missing for OAuth callbacks."*

          - Indexes review comments from the last 200 merged PRs on install
          - Tracks which feedback was accepted (code changed) vs dismissed
          - Learns team-specific patterns over time
          - Suppresses false alarms for patterns your team has already accepted

          ---

          ## Quick Start

          ### Prerequisites

          - Docker and Docker Compose
          - A GitHub App (see [Setup Guide](#github-app-setup))
          - An [Anthropic API key](https://console.anthropic.com/)

          ### Install

          ```bash
          git clone https://github.com/clearpr/clearpr.git
          cd clearpr
          cp .env.example .env
          ```

          Edit `.env` with your credentials:

          ```env
          GITHUB_APP_ID=your_app_id
          GITHUB_PRIVATE_KEY=your_private_key.pem
          GITHUB_WEBHOOK_SECRET=your_webhook_secret
          ANTHROPIC_API_KEY=sk-ant-...
          DATABASE_URL=postgresql://clearpr:clearpr@db:5432/clearpr
          REDIS_URL=redis://redis:6379
          ```

          Start ClearPR:

          ```bash
          docker compose up -d
          ```

          That's it. Open a PR in any repo where you've installed the GitHub App, and ClearPR will review it.

          ---

          ## GitHub App Setup

          1. Go to **GitHub Settings → Developer Settings → GitHub Apps → New GitHub App**
          2. Set the webhook URL to `https://your-server.com/webhook`
          3. Generate a webhook secret and add it to `.env`
          4. Set these permissions:
             - **Pull Requests:** Read & Write
                - **Contents:** Read
                   - **Metadata:** Read
                      - **Issues:** Read
                      5. Subscribe to these events:
                         - `pull_request`
                            - `pull_request_review_comment`
                               - `issue_comment`
                               6. Generate a private key and save the `.pem` file
                               7. Install the app on your repositories

                               ---

                               ## Usage

                               ### Automatic Reviews

                               ClearPR automatically reviews PRs when they are opened or updated. It posts:

                               - **Inline comments** on specific lines with severity tags
                               - **Summary comment** with an overview of all findings

                               Reviews are advisory only — ClearPR never approves or blocks your PRs.

                               ### PR Commands

                               Comment on any PR to interact with ClearPR:

                               | Command | What it does |
                               |---------|-------------|
                               | `@clearpr review` | Trigger a manual review |
                               | `@clearpr diff` | Post the clean semantic diff as a comment |
                               | `@clearpr ignore [pattern]` | Ignore a file pattern for this PR |
                               | `@clearpr config` | Show active config for this repo |

                               ---

                               ## Configuration

                               ### Environment Variables

                               | Variable | Required | Default | Description |
                               |----------|:--------:|---------|-------------|
                               | `GITHUB_APP_ID` | Yes | — | GitHub App ID |
                               | `GITHUB_PRIVATE_KEY` | Yes | — | Path to `.pem` private key |
                               | `GITHUB_WEBHOOK_SECRET` | Yes | — | Webhook signature verification |
                               | `ANTHROPIC_API_KEY` | Yes | — | Claude API key |
                               | `DATABASE_URL` | Yes | — | PostgreSQL connection string |
                               | `REDIS_URL` | Yes | — | Redis connection string |
                               | `REVIEW_MODEL` | No | `claude-sonnet-4-20250514` | Claude model to use |
                               | `MAX_DIFF_LINES` | No | `5000` | Skip review if clean diff exceeds this |
                               | `HISTORY_DEPTH` | No | `200` | Number of past PRs to index |

                               ### Project Config Files

                               **`claude.md` / `agent.md`** — Write your guidelines directly. ClearPR reads the full file and uses it as review context.

                               **`.reviewconfig`** — Point to multiple guideline files and configure behavior:

                               ```yaml
                               guidelines:
                                 - docs/coding-standards.md
                                   - docs/naming-conventions.md
                                     - docs/error-handling.md

                                     severity: medium        # low | medium | high | critical
                                     ignore:
                                       - '**/*.generated.ts'
                                         - '**/*.min.js'
                                           - 'migrations/**'
                                             - 'vendor/**'

                                             languages:              # override tree-sitter language detection
                                               '*.tsx': typescript
                                                 '*.blade.php': php
                                                 ```

                                                 ---

                                                 ## Architecture

                                                 ```
                                                 GitHub PR Webhook
                                                        │
                                                               ▼
                                                               ┌──────────────┐
                                                               │  NestJS API  │──── BullMQ ────┐
                                                               └──────────────┘                │
                                                                                               ▼
                                                                                                                   ┌───────────────────┐
                                                                                                                                       │   Review Worker   │
                                                                                                                                                           └───────────────────┘
                                                                                                                                                                                    │    │    │
                                                                                                                                                                                                  ┌──────────┘    │    └──────────┐
                                                                                                                                                                                                                ▼               ▼               ▼
                                                                                                                                                                                                                     ┌──────────────┐ ┌────────────┐ ┌──────────────┐
                                                                                                                                                                                                                          │  tree-sitter  │ │  pgvector  │ │  Claude API  │
                                                                                                                                                                                                                               │  Diff Engine  │ │  PR Memory │ │   Review     │
                                                                                                                                                                                                                                    └──────────────┘ └────────────┘ └──────────────┘
                                                                                                                                                                                                                                                  │               │               │
                                                                                                                                                                                                                                                                └───────────────┴───────────────┘
                                                                                                                                                                                                                                                                                              │
                                                                                                                                                                                                                                                                                                                            ▼
                                                                                                                                                                                                                                                                                                                                                ┌───────────────────┐
                                                                                                                                                                                                                                                                                                                                                                    │  GitHub PR        │
                                                                                                                                                                                                                                                                                                                                                                                        │  Inline Comments  │
                                                                                                                                                                                                                                                                                                                                                                                                            └───────────────────┘
                                                                                                                                                                                                                                                                                                                                                                                                            ```

                                                                                                                                                                                                                                                                                                                                                                                                            **Stack:** NestJS, PostgreSQL + pgvector, Redis + BullMQ, tree-sitter, Anthropic Claude API

                                                                                                                                                                                                                                                                                                                                                                                                            ---

                                                                                                                                                                                                                                                                                                                                                                                                            ## Language Support

                                                                                                                                                                                                                                                                                                                                                                                                            | Language | Diff Filtering | Status |
                                                                                                                                                                                                                                                                                                                                                                                                            |----------|:-:|:-:|
                                                                                                                                                                                                                                                                                                                                                                                                            | TypeScript / JavaScript | AST-based | ✅ Supported |
                                                                                                                                                                                                                                                                                                                                                                                                            | PHP | AST-based | ✅ Supported |
                                                                                                                                                                                                                                                                                                                                                                                                            | JSON | Structural | ✅ Supported |
                                                                                                                                                                                                                                                                                                                                                                                                            | YAML | Structural | ✅ Supported |
                                                                                                                                                                                                                                                                                                                                                                                                            | Python | AST-based | 🔜 Planned |
                                                                                                                                                                                                                                                                                                                                                                                                            | Go | AST-based | 🔜 Planned |
                                                                                                                                                                                                                                                                                                                                                                                                            | Java | AST-based | 🔜 Planned |
                                                                                                                                                                                                                                                                                                                                                                                                            | Other languages | Whitespace-only | ⚡ Fallback |

                                                                                                                                                                                                                                                                                                                                                                                                            Want support for another language? tree-sitter has [parsers for 100+ languages](https://tree-sitter.github.io/tree-sitter/#parsers). PRs welcome.

                                                                                                                                                                                                                                                                                                                                                                                                            ---

                                                                                                                                                                                                                                                                                                                                                                                                            ## How It Saves You Money

                                                                                                                                                                                                                                                                                                                                                                                                            By filtering formatting noise *before* sending to Claude, ClearPR uses significantly fewer tokens:

                                                                                                                                                                                                                                                                                                                                                                                                            | PR Size | Without ClearPR | With ClearPR | Savings |
                                                                                                                                                                                                                                                                                                                                                                                                            |---------|:-:|:-:|:-:|
                                                                                                                                                                                                                                                                                                                                                                                                            | Small (50 lines) | ~2,000 tokens | ~1,500 tokens | 25% |
                                                                                                                                                                                                                                                                                                                                                                                                            | Medium + formatter (500 lines) | ~15,000 tokens | ~4,000 tokens | 73% |
                                                                                                                                                                                                                                                                                                                                                                                                            | Large + prettier (5000+ lines) | ~80,000 tokens | ~8,000 tokens | 90% |

                                                                                                                                                                                                                                                                                                                                                                                                            For a team of 10 doing ~200 PRs/month: **~$25–60/month** vs $80–220/month sending raw diffs.

                                                                                                                                                                                                                                                                                                                                                                                                            ---

                                                                                                                                                                                                                                                                                                                                                                                                            ## System Requirements

                                                                                                                                                                                                                                                                                                                                                                                                            | | Minimum | Recommended |
                                                                                                                                                                                                                                                                                                                                                                                                            |---|---------|-------------|
                                                                                                                                                                                                                                                                                                                                                                                                            | CPU | 2 cores | 4 cores |
                                                                                                                                                                                                                                                                                                                                                                                                            | RAM | 2 GB | 4 GB |
                                                                                                                                                                                                                                                                                                                                                                                                            | Storage | 10 GB | 20 GB |
                                                                                                                                                                                                                                                                                                                                                                                                            | Network | Public HTTPS endpoint | Static IP + SSL |

                                                                                                                                                                                                                                                                                                                                                                                                            ---

                                                                                                                                                                                                                                                                                                                                                                                                            ## Development

                                                                                                                                                                                                                                                                                                                                                                                                            ```bash
                                                                                                                                                                                                                                                                                                                                                                                                            # Clone the repo
                                                                                                                                                                                                                                                                                                                                                                                                            git clone https://github.com/clearpr/clearpr.git
                                                                                                                                                                                                                                                                                                                                                                                                            cd clearpr

                                                                                                                                                                                                                                                                                                                                                                                                            # Install dependencies
                                                                                                                                                                                                                                                                                                                                                                                                            npm install

                                                                                                                                                                                                                                                                                                                                                                                                            # Start dev services (PostgreSQL + Redis)
                                                                                                                                                                                                                                                                                                                                                                                                            docker compose -f docker-compose.dev.yml up -d

                                                                                                                                                                                                                                                                                                                                                                                                            # Run migrations
                                                                                                                                                                                                                                                                                                                                                                                                            npm run migration:run

                                                                                                                                                                                                                                                                                                                                                                                                            # Start in dev mode
                                                                                                                                                                                                                                                                                                                                                                                                            npm run start:dev

                                                                                                                                                                                                                                                                                                                                                                                                            # Run tests
                                                                                                                                                                                                                                                                                                                                                                                                            npm run test
                                                                                                                                                                                                                                                                                                                                                                                                            ```

                                                                                                                                                                                                                                                                                                                                                                                                            ### Project Structure

                                                                                                                                                                                                                                                                                                                                                                                                            ```
                                                                                                                                                                                                                                                                                                                                                                                                            clearpr/
                                                                                                                                                                                                                                                                                                                                                                                                            ├── src/
                                                                                                                                                                                                                                                                                                                                                                                                            │   ├── webhook/          # GitHub webhook handler
                                                                                                                                                                                                                                                                                                                                                                                                            │   ├── diff/             # Semantic diff engine (tree-sitter)
                                                                                                                                                                                                                                                                                                                                                                                                            │   ├── review/           # AI review orchestration
                                                                                                                                                                                                                                                                                                                                                                                                            │   ├── memory/           # Past PR indexing and retrieval
                                                                                                                                                                                                                                                                                                                                                                                                            │   ├── config/           # Project config reader
                                                                                                                                                                                                                                                                                                                                                                                                            │   ├── github/           # GitHub API client
                                                                                                                                                                                                                                                                                                                                                                                                            │   └── queue/            # BullMQ job definitions
                                                                                                                                                                                                                                                                                                                                                                                                            ├── docker-compose.yml
                                                                                                                                                                                                                                                                                                                                                                                                            ├── Dockerfile
                                                                                                                                                                                                                                                                                                                                                                                                            ├── .env.example
                                                                                                                                                                                                                                                                                                                                                                                                            └── README.md
                                                                                                                                                                                                                                                                                                                                                                                                            ```

                                                                                                                                                                                                                                                                                                                                                                                                            ---

                                                                                                                                                                                                                                                                                                                                                                                                            ## Roadmap

                                                                                                                                                                                                                                                                                                                                                                                                            - [x] Semantic diff engine with tree-sitter
                                                                                                                                                                                                                                                                                                                                                                                                            - [x] AI review with project guidelines
                                                                                                                                                                                                                                                                                                                                                                                                            - [x] Past PR memory with pgvector
                                                                                                                                                                                                                                                                                                                                                                                                            - [ ] Auto-fix suggestions via GitHub suggested changes
                                                                                                                                                                                                                                                                                                                                                                                                            - [ ] Team analytics dashboard
                                                                                                                                                                                                                                                                                                                                                                                                            - [ ] Multi-repo support with shared guidelines
                                                                                                                                                                                                                                                                                                                                                                                                            - [ ] Slack/Teams notifications
                                                                                                                                                                                                                                                                                                                                                                                                            - [ ] Custom LLM providers (OpenAI, Ollama)
                                                                                                                                                                                                                                                                                                                                                                                                            - [ ] IDE plugin for pre-push review
                                                                                                                                                                                                                                                                                                                                                                                                            - [ ] GitLab/Bitbucket support

                                                                                                                                                                                                                                                                                                                                                                                                            ---

                                                                                                                                                                                                                                                                                                                                                                                                            ## Contributing

                                                                                                                                                                                                                                                                                                                                                                                                            Contributions are welcome. Here's how to help:

                                                                                                                                                                                                                                                                                                                                                                                                            1. **Add a language parser** — tree-sitter has parsers for 100+ languages. Pick one and add semantic diff support.
                                                                                                                                                                                                                                                                                                                                                                                                            2. **Improve review prompts** — better prompts = better reviews. Test against real PRs.
                                                                                                                                                                                                                                                                                                                                                                                                            3. **Report false positives** — if ClearPR flags something it shouldn't, open an issue with the diff.
                                                                                                                                                                                                                                                                                                                                                                                                            4. **Documentation** — setup guides, examples, tutorials.

                                                                                                                                                                                                                                                                                                                                                                                                            See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

                                                                                                                                                                                                                                                                                                                                                                                                            ---

                                                                                                                                                                                                                                                                                                                                                                                                            ## FAQ

                                                                                                                                                                                                                                                                                                                                                                                                            **Does ClearPR store my code?**
                                                                                                                                                                                                                                                                                                                                                                                                            ClearPR processes code in memory during review and discards it. Only review comments and their metadata are stored in the database for the learning system. Your source code is never persisted.

                                                                                                                                                                                                                                                                                                                                                                                                            **Can ClearPR block my PRs from merging?**
                                                                                                                                                                                                                                                                                                                                                                                                            No. ClearPR is advisory only. It posts comments but never approves or requests changes. Your existing review workflow stays intact.

                                                                                                                                                                                                                                                                                                                                                                                                            **What if tree-sitter can't parse a file?**
                                                                                                                                                                                                                                                                                                                                                                                                            ClearPR falls back to whitespace-only filtering. You'll still get a cleaner diff than GitHub's default, just not as precise as AST-based filtering.

                                                                                                                                                                                                                                                                                                                                                                                                            **Can I use a different LLM instead of Claude?**
                                                                                                                                                                                                                                                                                                                                                                                                            Not yet. Claude-only for v1. Multi-provider support (OpenAI, Ollama, local models) is on the roadmap.

                                                                                                                                                                                                                                                                                                                                                                                                            **How does it handle monorepos?**
                                                                                                                                                                                                                                                                                                                                                                                                            ClearPR processes each PR independently. For very large diffs, use `MAX_DIFF_LINES` and file exclusion patterns in `.reviewconfig` to keep token usage reasonable.

                                                                                                                                                                                                                                                                                                                                                                                                            ---

                                                                                                                                                                                                                                                                                                                                                                                                            ## License

                                                                                                                                                                                                                                                                                                                                                                                                            [MIT](LICENSE)

                                                                                                                                                                                                                                                                                                                                                                                                            ---

                                                                                                                                                                                                                                                                                                                                                                                                            Built by [Vineeth N K](https://github.com/vineethkrishnan) · Star this repo if it saves you from scrolling through Prettier diffs.
