import type { Result } from '../../../shared/types/result.types.js';
import type { DomainError } from '../../../shared/domain/errors/domain-error.base.js';
import type { Review } from '../../../review/domain/entities/review.entity.js';
import type { ReviewContext } from '../../../review/domain/types/review-context.types.js';

/**
 * Port for executing a PR review end-to-end.
 *
 * Owned by the queue module so its review consumer depends on a
 * contract rather than the review module's concrete orchestrator.
 * The binding lives in `QueueModule`.
 */
export abstract class ReviewExecutorPort {
  abstract execute(
    context: ReviewContext,
    triggerType: 'auto' | 'manual',
  ): Promise<Result<Review, DomainError>>;
}
