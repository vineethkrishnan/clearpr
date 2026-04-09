import { DomainError } from '../../../shared/domain/errors/domain-error.base.js';

export class GitHubApiError extends DomainError {
  readonly code = 'GITHUB_API_ERROR';
  readonly isTransient: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.isTransient = statusCode >= 500;
  }
}

export class GitHubRateLimitError extends DomainError {
  readonly code = 'GITHUB_RATE_LIMITED';
  readonly isTransient = true;
  readonly resetAt: Date;

  constructor(resetAt: Date) {
    super(`GitHub API rate limit exceeded. Resets at ${resetAt.toISOString()}`);
    this.resetAt = resetAt;
  }
}

export class InvalidSignatureError extends DomainError {
  readonly code = 'INVALID_SIGNATURE';
  readonly isTransient = false;

  constructor() {
    super('Invalid webhook signature');
  }
}
