import { Injectable, Logger } from '@nestjs/common';
import { GitHubClientService } from '../../../github/application/use-cases/github-client.use-case.js';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import {
  IndexingStatus,
  type Repository,
} from '../../../github/domain/entities/repository.entity.js';
import { AppConfig } from '../../../config/app.config.js';
import { IndexMemoryUseCase, type IndexableComment } from './index-memory.use-case.js';
import { DetectFeedbackOutcomeUseCase } from './detect-feedback-outcome.use-case.js';

@Injectable()
export class IndexRepositoryUseCase {
  private readonly logger = new Logger(IndexRepositoryUseCase.name);

  constructor(
    private readonly githubClient: GitHubClientService,
    private readonly installationRepo: InstallationRepositoryPort,
    private readonly repositoryRepo: RepositoryRepositoryPort,
    private readonly outcomeDetector: DetectFeedbackOutcomeUseCase,
    private readonly memoryIndexer: IndexMemoryUseCase,
    private readonly config: AppConfig,
  ) {}

  async indexInstallation(installationId: string): Promise<{ reposIndexed: number }> {
    const installation = await this.installationRepo.findById(installationId);
    if (!installation) {
      this.logger.warn({ installationId }, 'Indexing requested for unknown installation');
      return { reposIndexed: 0 };
    }
    const repos = await this.repositoryRepo.findByInstallationId(installationId);
    let reposIndexed = 0;
    for (const repo of repos) {
      try {
        await this.indexRepositoryWithInstallation(repo, installation.githubInstallationId);
        reposIndexed++;
      } catch (error) {
        this.logger.error(
          { repositoryId: repo.id, fullName: repo.fullName },
          `Failed to index repository: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    return { reposIndexed };
  }

  async indexRepository(repository: Repository): Promise<{ commentsIndexed: number }> {
    const installation = await this.installationRepo.findById(repository.installationId);
    if (!installation) {
      throw new Error(`Installation ${repository.installationId} not found`);
    }
    return this.indexRepositoryWithInstallation(repository, installation.githubInstallationId);
  }

  private async indexRepositoryWithInstallation(
    repository: Repository,
    githubInstallationId: number,
  ): Promise<{ commentsIndexed: number }> {
    const [owner, repo] = repository.fullName.split('/');
    if (!owner || !repo) {
      throw new Error(`Invalid repository fullName: ${repository.fullName}`);
    }

    repository.indexingStatus = IndexingStatus.IN_PROGRESS;
    await this.repositoryRepo.save(repository);

    try {
      const indexable = await this.collectIndexableComments(githubInstallationId, owner, repo);
      const commentsIndexed = await this.memoryIndexer.indexComments(repository.id, indexable);

      repository.indexingStatus = IndexingStatus.COMPLETED;
      await this.repositoryRepo.save(repository);

      this.logger.log(
        {
          audit: true,
          event: 'repository_indexed',
          repositoryId: repository.id,
          fullName: repository.fullName,
          commentsIndexed,
        },
        `Indexed ${commentsIndexed} comments from ${repository.fullName}`,
      );

      return { commentsIndexed };
    } catch (error) {
      repository.indexingStatus = IndexingStatus.FAILED;
      await this.repositoryRepo.save(repository);
      throw error;
    }
  }

  private async collectIndexableComments(
    installationId: number,
    owner: string,
    repo: string,
  ): Promise<IndexableComment[]> {
    const mergedPrs = await this.githubClient.listMergedPullRequests(
      installationId,
      owner,
      repo,
      this.config.HISTORY_DEPTH,
    );

    const indexable: IndexableComment[] = [];

    for (const pr of mergedPrs) {
      const [comments, commits] = await Promise.all([
        this.githubClient.listPullRequestReviewComments(installationId, owner, repo, pr.number),
        this.githubClient.listPullRequestCommits(installationId, owner, repo, pr.number),
      ]);

      for (const comment of comments) {
        if (!comment.line) continue;
        const outcome = this.outcomeDetector.detect({
          commentCreatedAt: comment.createdAt,
          filePath: comment.filePath,
          lineRange: [comment.startLine ?? comment.line, comment.line],
          subsequentCommits: commits,
        });

        indexable.push({
          prNumber: comment.prNumber,
          commentAuthor: comment.authorLogin,
          commentText: comment.body,
          codeContext: comment.diffHunk,
          outcome,
        });
      }
    }

    return indexable;
  }
}
