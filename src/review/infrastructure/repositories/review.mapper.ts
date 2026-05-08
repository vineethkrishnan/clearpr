import { Review } from '../../domain/entities/review.entity.js';
import { ReviewStatus } from '../../domain/value-objects/review-status.vo.js';
import { ReviewTrigger } from '../../domain/value-objects/review-trigger.vo.js';
import { ReviewRecord } from './review.record.js';

export class ReviewMapper {
  static toDomain(record: ReviewRecord): Review {
    return Review.reconstitute({
      id: record.id,
      repositoryId: record.repository_id,
      prNumber: record.pr_number,
      prSha: record.pr_sha,
      trigger: record.trigger as ReviewTrigger,
      status: record.status as ReviewStatus,
      rawDiffLines: record.raw_diff_lines ?? undefined,
      semanticDiffLines: record.semantic_diff_lines ?? undefined,
      noiseReductionPct:
        record.noise_reduction_pct === null ? undefined : Number(record.noise_reduction_pct),
      modelUsed: record.model_used ?? undefined,
      promptTokens: record.prompt_tokens ?? undefined,
      completionTokens: record.completion_tokens ?? undefined,
      reviewDurationMs: record.review_duration_ms ?? undefined,
      errorMessage: record.error_message ?? undefined,
      progressCommentId:
        record.progress_comment_id === null ? undefined : Number(record.progress_comment_id),
      checkRunId: record.check_run_id === null ? undefined : Number(record.check_run_id),
    });
  }

  static toRecord(entity: Review): ReviewRecord {
    const record = new ReviewRecord();
    record.id = entity.id;
    record.repository_id = entity.repositoryId;
    record.pr_number = entity.prNumber;
    record.pr_sha = entity.prSha;
    record.trigger = entity.trigger;
    record.status = entity.status;
    record.raw_diff_lines = entity.rawDiffLines ?? null;
    record.semantic_diff_lines = entity.semanticDiffLines ?? null;
    record.noise_reduction_pct = entity.noiseReductionPct ?? null;
    record.model_used = entity.modelUsed ?? null;
    record.prompt_tokens = entity.promptTokens ?? null;
    record.completion_tokens = entity.completionTokens ?? null;
    record.review_duration_ms = entity.reviewDurationMs ?? null;
    record.error_message = entity.errorMessage ?? null;
    record.progress_comment_id =
      entity.progressCommentId === undefined ? null : String(entity.progressCommentId);
    record.check_run_id = entity.checkRunId === undefined ? null : String(entity.checkRunId);
    record.created_at = entity.createdAt;
    return record;
  }
}
