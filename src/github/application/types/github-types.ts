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
