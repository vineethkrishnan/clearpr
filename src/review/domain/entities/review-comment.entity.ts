import { BaseEntity } from '../../../shared/domain/entity.base.js';
import { type Severity } from '../value-objects/severity.vo.js';

export class ReviewComment extends BaseEntity {
  readonly reviewId: string;
  readonly filePath: string;
  readonly line: number;
  readonly side: 'LEFT' | 'RIGHT';
  readonly severity: Severity;
  readonly body: string;

  constructor(params: {
    id?: string;
    reviewId: string;
    filePath: string;
    line: number;
    side?: 'LEFT' | 'RIGHT';
    severity: Severity;
    body: string;
  }) {
    super(params.id);
    this.reviewId = params.reviewId;
    this.filePath = params.filePath;
    this.line = params.line;
    this.side = params.side ?? 'RIGHT';
    this.severity = params.severity;
    this.body = params.body;
  }
}
