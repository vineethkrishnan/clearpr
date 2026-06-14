import type { ReviewContext } from '../types/review-context.types.js';
import { type ReviewComment } from '../entities/review-comment.entity.js';

export abstract class ReviewPosterPort {
  // Returns true if the inline comments were anchored to the diff, false if
  // GitHub could not resolve the lines (so findings should be surfaced in the
  // summary instead). Throws for any other failure.
  abstract postInlineComments(context: ReviewContext, comments: ReviewComment[]): Promise<boolean>;
  abstract postSummary(context: ReviewContext, summary: string): Promise<number>;
  abstract updateSummary(context: ReviewContext, commentId: number, summary: string): Promise<void>;
  abstract postProgressPlaceholder(context: ReviewContext): Promise<number>;
}
