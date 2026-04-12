# Requirements

Everything you need before installing ClearPR.

## System Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| **Docker** | 20.10+ | Latest stable |
| **Docker Compose** | v2.0+ | Latest stable |
| **RAM** | 512 MB (idle) | 1 GB+ (under load) |
| **Disk** | 1 GB | 2 GB+ (grows with PR memory) |
| **CPU** | 1 core | 2-4 cores (for concurrent reviews) |

For local development without Docker:

| Requirement | Version |
|---|---|
| **Node.js** | 20 LTS or later |
| **npm** | 10+ |
| **PostgreSQL** | 16+ with [pgvector](https://github.com/pgvector/pgvector) extension |
| **Redis** | 7+ |

## GitHub App

You need a GitHub App registered in your GitHub account or organization. ClearPR uses it to:
- Receive webhook events when PRs are opened or updated
- Read file contents for semantic diffing
- Post review comments

See [GitHub App Setup](./github-app-setup) for step-by-step instructions.

### Required Permissions

| Permission | Access | Why |
|---|---|---|
| Pull requests | Read & Write | Read PR metadata/diff, post review comments |
| Contents | Read | Fetch file contents for AST parsing, read guideline files |
| Metadata | Read | Required for all GitHub Apps |
| Issues | Read | Read issue comments for @clearpr commands |

## LLM Provider API Key

ClearPR needs an API key for at least one LLM provider to generate reviews:

| Provider | Env var | Notes |
|---|---|---|
| **Anthropic** (default) | `LLM_API_KEY` | Claude models |
| **OpenAI** | `LLM_API_KEY` | GPT-4o and similar |
| **Mistral** | `LLM_API_KEY` | Mistral Large |
| **Google Gemini** | `LLM_API_KEY` | Gemini Pro |
| **Ollama** | `LLM_BASE_URL` | Self-hosted, no API key needed |

See [LLM Providers](./llm-providers) for configuration details.

## Embedding Provider (Optional)

For the past PR memory feature, ClearPR uses vector embeddings. By default it uses Voyage AI (`voyage-3-lite`), which requires a `VOYAGE_API_KEY`. If you don't configure this, ClearPR still works — it just skips the memory context during reviews.

## Network Access

ClearPR needs outbound access to:
- `api.github.com` — GitHub API for reading PRs and posting reviews
- Your LLM provider's API endpoint (e.g., `api.anthropic.com`)
- Your embedding provider's API endpoint (if using memory)

Inbound, your server needs to be reachable from GitHub's webhook IPs on the port you configure (default: 3000). You'll typically put ClearPR behind a reverse proxy with HTTPS.
