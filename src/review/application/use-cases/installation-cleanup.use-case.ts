import { Injectable, Logger } from '@nestjs/common';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { MemoryRepositoryPort } from '../../../memory/domain/ports/memory-repository.port.js';
import { ReviewRepositoryPort } from '../../domain/ports/review-repository.port.js';

export interface CleanupResult {
  repositoriesDeleted: number;
  reviewsDeleted: number;
  memoryEntriesDeleted: number;
}

@Injectable()
export class InstallationCleanupService {
  private readonly logger = new Logger(InstallationCleanupService.name);

  constructor(
    private readonly installationRepo: InstallationRepositoryPort,
    private readonly repositoryRepo: RepositoryRepositoryPort,
    private readonly reviewRepo: ReviewRepositoryPort,
    private readonly memoryRepo: MemoryRepositoryPort,
  ) {}

  /**
   * Per PRD §5.1 + §5.4: on installation.deleted, mark inactive and purge
   * all data associated with the installation's repositories. The
   * installation row itself is preserved with status=inactive for audit.
   */
  async cleanupInstallation(
    installationId: string,
    githubInstallationId: number,
  ): Promise<CleanupResult> {
    const repositories = await this.repositoryRepo.findByInstallationId(installationId);
    const repoIds = repositories.map((r) => r.id);

    const memoryDeleted = await this.memoryRepo.deleteByRepositoryIds(repoIds);
    const reviewsDeleted = await this.reviewRepo.deleteByRepositoryIds(repoIds);
    const reposDeleted = await this.repositoryRepo.deleteByInstallationId(installationId);

    const installation = await this.installationRepo.findByGithubId(githubInstallationId);
    if (installation) {
      installation.markInactive();
      await this.installationRepo.save(installation);
    }

    this.logger.log(
      {
        audit: true,
        event: 'installation_cleanup',
        installationId,
        repositoriesDeleted: reposDeleted,
        reviewsDeleted,
        memoryEntriesDeleted: memoryDeleted,
      },
      `Installation cleanup complete: ${reposDeleted} repos, ${reviewsDeleted} reviews, ${memoryDeleted} memory entries`,
    );

    return {
      repositoriesDeleted: reposDeleted,
      reviewsDeleted,
      memoryEntriesDeleted: memoryDeleted,
    };
  }

  /**
   * Per PRD §5.4: on installation_repositories.removed, purge data for
   * just the specified repositories (installation itself stays active).
   */
  async cleanupRepository(githubRepoId: number): Promise<CleanupResult | null> {
    const repository = await this.repositoryRepo.deleteByGithubId(githubRepoId);
    if (!repository) {
      return null;
    }

    const memoryDeleted = await this.memoryRepo.deleteByRepositoryId(repository.id);
    const reviewsDeleted = await this.reviewRepo.deleteByRepositoryId(repository.id);

    this.logger.log(
      {
        audit: true,
        event: 'repository_cleanup',
        repositoryId: repository.id,
        githubRepoId,
        reviewsDeleted,
        memoryEntriesDeleted: memoryDeleted,
      },
      `Repository cleanup complete: ${repository.fullName}`,
    );

    return {
      repositoriesDeleted: 1,
      reviewsDeleted,
      memoryEntriesDeleted: memoryDeleted,
    };
  }
}
