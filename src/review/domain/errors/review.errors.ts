import { DomainError } from '../../../shared/domain/errors/domain-error.base.js';

export class LlmTimeoutError extends DomainError {
  readonly code = 'LLM_TIMEOUT';
  readonly isTransient = true;

  constructor() {
    super('LLM request timed out');
  }
}

export class LlmRateLimitError extends DomainError {
  readonly code = 'LLM_RATE_LIMITED';
  readonly isTransient = true;
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(`LLM rate limited. Retry after ${retryAfter}s`);
    this.retryAfter = retryAfter;
  }
}

export class MalformedLlmResponseError extends DomainError {
  readonly code = 'LLM_RESPONSE_MALFORMED';
  readonly isTransient = true;

  constructor(reason: string) {
    super(`LLM response could not be parsed: ${reason}`);
  }
}

export class GuidelinesNotFoundError extends DomainError {
  readonly code = 'GUIDELINES_NOT_FOUND';
  readonly isTransient = false;

  constructor(repositoryId: string) {
    super(`No guidelines found for repository ${repositoryId}`);
  }
}
