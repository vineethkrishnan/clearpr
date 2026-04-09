import { Review } from './review.entity.js';
import { ReviewStatus } from '../value-objects/review-status.vo.js';
import { ReviewTrigger } from '../value-objects/review-trigger.vo.js';

describe('Review', () => {
  const createReview = () =>
    Review.create({
      repositoryId: 'repo-1',
      prNumber: 42,
      prSha: 'abc123',
      trigger: ReviewTrigger.AUTO,
    });

  it('should create with QUEUED status', () => {
    const review = createReview();
    expect(review.status).toBe(ReviewStatus.QUEUED);
    expect(review.prNumber).toBe(42);
    expect(review.trigger).toBe(ReviewTrigger.AUTO);
  });

  it('should transition to PROCESSING', () => {
    const review = createReview();
    review.markProcessing();
    expect(review.status).toBe(ReviewStatus.PROCESSING);
  });

  it('should transition to COMPLETED with stats', () => {
    const review = createReview();
    review.markProcessing();
    review.markCompleted({
      rawDiffLines: 1000,
      semanticDiffLines: 50,
      noiseReductionPct: 95,
      modelUsed: 'claude-sonnet-4-20250514',
      promptTokens: 3000,
      completionTokens: 500,
      durationMs: 12000,
    });
    expect(review.status).toBe(ReviewStatus.COMPLETED);
    expect(review.rawDiffLines).toBe(1000);
    expect(review.semanticDiffLines).toBe(50);
    expect(review.modelUsed).toBe('claude-sonnet-4-20250514');
  });

  it('should transition to FAILED with error', () => {
    const review = createReview();
    review.markFailed('LLM_TIMEOUT', 'Request timed out');
    expect(review.status).toBe(ReviewStatus.FAILED);
    expect(review.errorMessage).toContain('LLM_TIMEOUT');
  });

  it('should transition to SKIPPED', () => {
    const review = createReview();
    review.markSkipped('Diff too large');
    expect(review.status).toBe(ReviewStatus.SKIPPED);
  });
});
