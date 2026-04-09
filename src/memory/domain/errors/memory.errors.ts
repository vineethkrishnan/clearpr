import { DomainError } from '../../../shared/domain/errors/domain-error.base.js';

export class EmbeddingApiError extends DomainError {
  readonly code = 'EMBEDDING_API_FAILED';
  readonly isTransient = true;

  constructor(reason: string) {
    super(`Embedding API failed: ${reason}`);
  }
}
