export interface BaseJobPayload {
  correlationId: string;
  installationId: string;
  repositoryId: string;
  repoFullName: string;
}

export interface ReviewJobPayload extends BaseJobPayload {
  prNumber: number;
  prSha: string;
  trigger: 'auto' | 'manual';
  baseBranch: string;
}

export interface CommandJobPayload extends BaseJobPayload {
  prNumber: number;
  command: 'review' | 'diff' | 'ignore' | 'config';
  args?: string;
  commentId: number;
}

export interface IndexingJobPayload extends BaseJobPayload {
  type: 'bulk' | 'incremental';
  prNumber?: number;
}

export const QUEUE_NAMES = {
  REVIEWS: 'reviews',
  COMMANDS: 'commands',
  INDEXING: 'indexing',
} as const;
