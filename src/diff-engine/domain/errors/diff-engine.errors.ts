import { DomainError } from '../../../shared/domain/errors/domain-error.base.js';

export class DiffTooLargeError extends DomainError {
  readonly code = 'DIFF_TOO_LARGE';
  readonly isTransient = false;

  constructor(semanticLines: number, maxLines: number) {
    super(`Semantic diff has ${semanticLines} lines, exceeding limit of ${maxLines}`);
  }
}
