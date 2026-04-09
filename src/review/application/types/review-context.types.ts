export interface ReviewContext {
  repositoryId: string;
  installationId: string;
  owner: string;
  repo: string;
  prNumber: number;
  prSha: string;
  baseBranch: string;
}
