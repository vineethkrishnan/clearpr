import { DomainError } from '../../../shared/domain/errors/domain-error.base.js';

export class DiffTooLargeError extends DomainError {
  readonly code = 'DIFF_TOO_LARGE';
  readonly isTransient = false;

  constructor(semanticLines: number, maxLines: number) {
    super(`Semantic diff has ${semanticLines} lines, exceeding limit of ${maxLines}`);
  }
}

export class AstParseError extends DomainError {
  readonly code = 'AST_PARSE_FAILED';
  readonly isTransient = false;

  constructor(filePath: string, reason: string) {
    super(`Failed to parse ${filePath}: ${reason}`);
  }
}
