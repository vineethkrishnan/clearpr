import { DomainError } from '../../../shared/domain/errors/domain-error.base.js';

export class EmbeddingApiError extends DomainError {
  readonly code = 'EMBEDDING_API_FAILED';
  readonly isTransient = true;

  constructor(reason: string) {
    super(`Embedding API failed: ${reason}`);
  }
}

export class InstallationNotFoundError extends DomainError {
  readonly code = 'INSTALLATION_NOT_FOUND';
  readonly isTransient = false;

  constructor(installationId: string) {
    super(`Installation ${installationId} not found`);
  }
}

export class InvalidRepositoryFullNameError extends DomainError {
  readonly code = 'INVALID_REPOSITORY_FULL_NAME';
  readonly isTransient = false;

  constructor(fullName: string) {
    super(`Invalid repository fullName: ${fullName}`);
  }
}
