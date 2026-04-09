import { type Severity } from '../../domain/value-objects/severity.vo.js';

export interface ParsedReviewComment {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  severity: Severity;
  body: string;
}

export interface ParsedReview {
  comments: ParsedReviewComment[];
  summary: string;
}
