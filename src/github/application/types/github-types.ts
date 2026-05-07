export interface GitHubPrFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  patch?: string;
  previousFilename?: string;
}

export interface GitHubPr {
  number: number;
  sha: string;
  baseBranch: string;
  headBranch: string;
  title: string;
  body: string | null;
}

export interface GitHubMergedPr {
  number: number;
  mergedAt: Date;
  mergeCommitSha: string | null;
  title: string;
}

export interface GitHubReviewComment {
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

export interface GitHubPrCommit {
  sha: string;
  committedAt: Date;
  changedFiles: string[];
}
