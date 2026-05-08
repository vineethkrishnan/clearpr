import type { Repository } from '../../../github/domain/entities/repository.entity.js';

/**
 * Port for indexing PR memory data for an installation or a single repository.
 *
 * Owned by the queue module so its indexing consumer depends on a
 * contract rather than the memory module's concrete index use case.
 * The binding lives in `QueueModule`.
 */
export abstract class RepositoryIndexerPort {
  abstract indexInstallation(installationId: string): Promise<{ reposIndexed: number }>;

  abstract indexRepository(repository: Repository): Promise<{ commentsIndexed: number }>;
}
