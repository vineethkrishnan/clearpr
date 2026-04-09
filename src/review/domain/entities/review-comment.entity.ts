import { BaseEntity } from '../../../shared/domain/entity.base.js';
import { type Severity } from '../value-objects/severity.vo.js';

export type PostStatus = 'pending' | 'posted' | 'failed';

export class ReviewComment extends BaseEntity {
  readonly reviewId: string;
  readonly filePath: string;
  readonly line: number;
  readonly side: 'LEFT' | 'RIGHT';
  readonly severity: Severity;
  readonly body: string;
  githubCommentId?: number;
  postStatus: PostStatus;

  constructor(params: {
    id?: string;
    reviewId: string;
    filePath: string;
    line: number;
    side?: 'LEFT' | 'RIGHT';
    severity: Severity;
    body: string;
    postStatus?: PostStatus;
  }) {
    super(params.id);
    this.reviewId = params.reviewId;
    this.filePath = params.filePath;
    this.line = params.line;
    this.side = params.side ?? 'RIGHT';
    this.severity = params.severity;
    this.body = params.body;
    this.postStatus = params.postStatus ?? 'pending';
  }

  markPosted(githubCommentId: number): void {
    this.githubCommentId = githubCommentId;
    this.postStatus = 'posted';
    this.updatedAt = new Date();
  }

  markFailed(): void {
    this.postStatus = 'failed';
    this.updatedAt = new Date();
  }
}
