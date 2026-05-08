import { Injectable } from '@nestjs/common';
import { GitHubClientService } from '../../../github/application/use-cases/github-client.use-case.js';
import {
  PrHistoryProviderPort,
  type PrHistoryMergedPr,
  type PrHistoryReviewComment,
  type PrHistoryCommit,
} from '../../application/ports/pr-history-provider.port.js';

/**
 * Adapter that fulfils memory's PrHistoryProviderPort by delegating to
 * the github module's `GitHubClientService`. Keeps memory decoupled
 * from the github client's broader concrete shape.
 */
@Injectable()
export class GithubPrHistoryAdapter extends PrHistoryProviderPort {
  constructor(private readonly githubClient: GitHubClientService) {
    super();
  }

  async listMergedPullRequests(
    installationId: number,
    owner: string,
    repo: string,
    limit: number,
  ): Promise<PrHistoryMergedPr[]> {
    return this.githubClient.listMergedPullRequests(installationId, owner, repo, limit);
  }

  async listPullRequestReviewComments(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PrHistoryReviewComment[]> {
    return this.githubClient.listPullRequestReviewComments(installationId, owner, repo, prNumber);
  }

  async listPullRequestCommits(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PrHistoryCommit[]> {
    return this.githubClient.listPullRequestCommits(installationId, owner, repo, prNumber);
  }
}
