# Contributing to ClearPR

Thank you for your interest in contributing! This document covers the development workflow, conventions, and expectations.

## Prerequisites

- Node.js >= 20
- Docker & Docker Compose
- A GitHub App registration for local testing

## Development Setup

```bash
git clone https://github.com/vineethkrishnan/ClearPR.git
cd ClearPR
npm install
cp .env.example .env  # fill in your GitHub App credentials
docker compose up -d  # start PostgreSQL + Redis
npm run start:dev
```

## Workflow

1. Fork the repo and create a feature branch from `main`
2. Make your changes with tests
3. Ensure all checks pass locally:
   ```bash
   npm run lint:check    # ESLint
   npm run test:cov      # Jest with coverage
   npm run build         # TypeScript compile
   ```
4. Commit using [Conventional Commits](#commit-messages)
5. Open a pull request against `main`

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/). PR titles are validated automatically.

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `build`, `ci`, `perf`, `hotfix`

**Scopes:** `github-app`, `diff-engine`, `ai-review`, `memory`, `webhooks`, `api`, `config`, `docker`, `deps`, `ci`, `docs`, `security`, `release`

**Examples:**
```
feat(diff-engine): add tree-sitter parser for TypeScript
fix(webhooks): validate HMAC signature before processing payload
chore(deps): bump @nestjs/core to 11.1.0
```

- Subject starts lowercase, imperative mood, no trailing period
- Keep the header under 100 characters
- Add a blank line before the body if present

## Pull Request Guidelines

- Keep PRs focused — one concern per PR
- Include tests for new behaviour
- Update docs if you change behaviour visible to users
- All CI checks must pass before merge

## Code Style

- TypeScript strict mode — no `any`, use `unknown` when needed
- Early return over nested `if/else`
- Intent-revealing names — avoid abbreviations (`res`, `obj`, `tmp`)
- Booleans prefixed with `is`, `has`, `can`, `should`
- Formatting enforced by Prettier (run `npm run format`)

## Reporting Bugs

Open a GitHub issue with:
- ClearPR version
- Steps to reproduce
- Expected vs actual behaviour
- Relevant logs (redact any tokens)

## Security Issues

See [SECURITY.md](SECURITY.md) — please do not open public issues for vulnerabilities.
