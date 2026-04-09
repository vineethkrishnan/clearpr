import { type LanguageValue } from '../value-objects/language.vo.js';
import { calculateNoiseReductionPct } from '../utils/noise-reduction.js';
import { type DiffHunk } from '../value-objects/diff-hunk.vo.js';

export type DiffStrategy = 'ast' | 'whitespace' | 'structural' | 'identity';

export class FileDiff {
  readonly filePath: string;
  readonly language: LanguageValue;
  readonly hunks: DiffHunk[];
  readonly rawLines: number;
  readonly semanticLines: number;
  readonly strategy: DiffStrategy;
  readonly isNew: boolean;
  readonly isDeleted: boolean;
  readonly isRenamed: boolean;
  readonly previousPath?: string;

  constructor(params: {
    filePath: string;
    language: LanguageValue;
    hunks: DiffHunk[];
    rawLines: number;
    semanticLines: number;
    strategy: DiffStrategy;
    isNew?: boolean;
    isDeleted?: boolean;
    isRenamed?: boolean;
    previousPath?: string;
  }) {
    this.filePath = params.filePath;
    this.language = params.language;
    this.hunks = params.hunks;
    this.rawLines = params.rawLines;
    this.semanticLines = params.semanticLines;
    this.strategy = params.strategy;
    this.isNew = params.isNew ?? false;
    this.isDeleted = params.isDeleted ?? false;
    this.isRenamed = params.isRenamed ?? false;
    this.previousPath = params.previousPath;
  }

  get noiseReductionPct(): number {
    return calculateNoiseReductionPct(this.rawLines, this.semanticLines);
  }
}
