import type { ReviewContext } from '../../application/types/review-context.types.js';
import { type ReviewComment } from '../entities/review-comment.entity.js';

export abstract class ReviewPosterPort {
  abstract postInlineComments(context: ReviewContext, comments: ReviewComment[]): Promise<void>;
  abstract postSummary(context: ReviewContext, summary: string): Promise<void>;
}
