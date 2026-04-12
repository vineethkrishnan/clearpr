# Help & Support

## Reporting Bugs

Found a bug? Please open an issue on GitHub:

**[github.com/vineethkrishnan/clearpr/issues](https://github.com/vineethkrishnan/clearpr/issues)**

Include the following in your report:
- ClearPR version (check `docker compose logs app | head -5` or `package.json`)
- Steps to reproduce
- Expected vs actual behavior
- Relevant log output (`docker compose logs app --tail=50`)

## Feature Requests

Have an idea for ClearPR? Open a GitHub issue with the **enhancement** label. Describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## Contributing

ClearPR is open source under the MIT license. Contributions are welcome.

### Quick start for contributors

```bash
# Fork and clone the repo
git clone https://github.com/your-username/clearpr.git
cd ClearPR

# Install dependencies
npm install

# Start dev services (PostgreSQL + Redis)
docker compose -f docker-compose.dev.yml up -d

# Run in dev mode
npm run start:dev

# Run tests
npm test              # unit tests
npm run test:e2e      # end-to-end tests
npm run lint:check    # linting
```

### Code guidelines

- TypeScript strict mode, no `any` types
- DDD hexagonal architecture — domain logic in `domain/`, adapters in `infrastructure/`
- Conventional Commits for all commit messages
- All PRs must pass CI (lint, type check, tests)

See [CONTRIBUTING.md](https://github.com/vineethkrishnan/clearpr/blob/main/CONTRIBUTING.md) for full guidelines.

### Project structure

```
src/
  config/          # Environment validation
  diff-engine/     # Semantic diff (normalizers, file processing)
  github/          # GitHub API client, token management
  health/          # Health check endpoints
  memory/          # Past PR feedback (embeddings, retrieval)
  queue/           # BullMQ job processing
  review/          # AI review pipeline (orchestrator, LLM, posting)
  shared/          # Base classes, database, Redis, logging
  webhook/         # Webhook controller, HMAC, dispatcher
test/              # E2E tests
docs-site/         # This documentation (VitePress)
```

## Security

Found a security vulnerability? Please report it responsibly:

- **Do NOT open a public issue** for security vulnerabilities
- Email the maintainer or use GitHub's [private vulnerability reporting](https://github.com/vineethkrishnan/clearpr/security/advisories/new)
- See [SECURITY.md](https://github.com/vineethkrishnan/clearpr/blob/main/SECURITY.md) for our security policy

## License

ClearPR is released under the [MIT License](https://github.com/vineethkrishnan/clearpr/blob/main/LICENSE). You are free to use, modify, and distribute it.
