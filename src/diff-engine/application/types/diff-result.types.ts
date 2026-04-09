import { type FileDiff } from '../../domain/entities/file-diff.entity.js';

export interface SemanticDiffResult {
  files: FileDiff[];
  totalRawLines: number;
  totalSemanticLines: number;
  noiseReductionPct: number;
  skippedFiles: string[];
}

export interface DiffInput {
  installationId: string;
  repositoryId: string;
  owner: string;
  repo: string;
  baseSha: string;
  headSha: string;
  files: FileInput[];
  languageOverrides?: Record<string, string>;
}

export interface FileInput {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
  previousFilename?: string;
}
