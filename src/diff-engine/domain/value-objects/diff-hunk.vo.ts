export enum ChangeType {
  ADDED = 'added',
  REMOVED = 'removed',
  MODIFIED = 'modified',
}

export interface DiffHunk {
  startLine: number;
  endLine: number;
  content: string;
  changeType: ChangeType;
}
