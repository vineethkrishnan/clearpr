export interface PrHistoryMergedPr {
  number: number;
  mergedAt: Date;
  mergeCommitSha: string | null;
  title: string;
}

export interface PrHistoryReviewComment {
  id: number;
  prNumber: number;
  authorLogin: string;
  body: string;
  filePath: string;
  startLine: number | null;
  line: number | null;
  diffHunk: string;
  createdAt: Date;
}

export interface PrHistoryCommit {
  sha: string;
  committedAt: Date;
  changedFiles: string[];
}

/**
 * Port for reading historical PR data (merged PRs, review comments, commits)
 * needed to build the memory index.
 *
 * Owned by the memory module so its index use case depends on a contract
 * rather than the github module's concrete client service. The binding
 * lives in `MemoryModule` and is implemented by an adapter that delegates
 * to `GitHubClientService`.
 */
export abstract class PrHistoryProviderPort {
  abstract listMergedPullRequests(
    installationId: number,
    owner: string,
    repo: string,
    limit: number,
  ): Promise<PrHistoryMergedPr[]>;

  abstract listPullRequestReviewComments(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PrHistoryReviewComment[]>;

  abstract listPullRequestCommits(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PrHistoryCommit[]>;
}
