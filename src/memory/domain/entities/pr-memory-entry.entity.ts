import { BaseEntity } from '../../../shared/domain/entity.base.js';
import { type FeedbackOutcome } from '../value-objects/feedback-outcome.vo.js';

export class PrMemoryEntry extends BaseEntity {
  readonly repositoryId: string;
  readonly prNumber: number;
  readonly commentAuthor: string;
  readonly commentText: string;
  readonly codeContext: string;
  readonly outcome: FeedbackOutcome;
  embedding: number[];

  constructor(params: {
    id?: string;
    repositoryId: string;
    prNumber: number;
    commentAuthor: string;
    commentText: string;
    codeContext: string;
    outcome: FeedbackOutcome;
    embedding: number[];
  }) {
    super(params.id);
    this.repositoryId = params.repositoryId;
    this.prNumber = params.prNumber;
    this.commentAuthor = params.commentAuthor;
    this.commentText = params.commentText;
    this.codeContext = params.codeContext;
    this.outcome = params.outcome;
    this.embedding = params.embedding;
  }
}
