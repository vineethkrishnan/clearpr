import type { Repository } from '../../../github/domain/entities/repository.entity.js';

export abstract class RepositoryIndexerPort {
  abstract indexInstallation(installationId: string): Promise<{ reposIndexed: number }>;

  abstract indexRepository(repository: Repository): Promise<{ commentsIndexed: number }>;

  abstract indexRepositoryById(repositoryId: string): Promise<{ commentsIndexed: number } | null>;
}
