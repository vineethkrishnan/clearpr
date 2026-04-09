import { BaseEntity } from '../../../shared/domain/entity.base.js';
import { ReviewStatus } from '../value-objects/review-status.vo.js';
import { type ReviewTrigger } from '../value-objects/review-trigger.vo.js';
import { type ReviewComment } from './review-comment.entity.js';

export class Review extends BaseEntity {
  readonly repositoryId: string;
  readonly prNumber: number;
  readonly prSha: string;
  readonly trigger: ReviewTrigger;
  status: ReviewStatus;
  rawDiffLines?: number;
  semanticDiffLines?: number;
  noiseReductionPct?: number;
  modelUsed?: string;
  promptTokens?: number;
  completionTokens?: number;
  reviewDurationMs?: number;
  errorMessage?: string;
  comments: ReviewComment[];

  private constructor(params: {
    id?: string;
    repositoryId: string;
    prNumber: number;
    prSha: string;
    trigger: ReviewTrigger;
    status?: ReviewStatus;
  }) {
    super(params.id);
    this.repositoryId = params.repositoryId;
    this.prNumber = params.prNumber;
    this.prSha = params.prSha;
    this.trigger = params.trigger;
    this.status = params.status ?? ReviewStatus.QUEUED;
    this.comments = [];
  }

  static create(params: {
    repositoryId: string;
    prNumber: number;
    prSha: string;
    trigger: ReviewTrigger;
  }): Review {
    return new Review(params);
  }

  static reconstitute(params: {
    id: string;
    repositoryId: string;
    prNumber: number;
    prSha: string;
    trigger: ReviewTrigger;
    status: ReviewStatus;
  }): Review {
    return new Review(params);
  }

  markProcessing(): void {
    this.status = ReviewStatus.PROCESSING;
    this.updatedAt = new Date();
  }

  markCompleted(stats: {
    rawDiffLines: number;
    semanticDiffLines: number;
    noiseReductionPct: number;
    modelUsed: string;
    promptTokens: number;
    completionTokens: number;
    durationMs: number;
  }): void {
    this.status = ReviewStatus.COMPLETED;
    this.rawDiffLines = stats.rawDiffLines;
    this.semanticDiffLines = stats.semanticDiffLines;
    this.noiseReductionPct = stats.noiseReductionPct;
    this.modelUsed = stats.modelUsed;
    this.promptTokens = stats.promptTokens;
    this.completionTokens = stats.completionTokens;
    this.reviewDurationMs = stats.durationMs;
    this.updatedAt = new Date();
  }

  markFailed(code: string, message: string): void {
    this.status = ReviewStatus.FAILED;
    this.errorMessage = `[${code}] ${message}`;
    this.updatedAt = new Date();
  }

  markSkipped(reason: string): void {
    this.status = ReviewStatus.SKIPPED;
    this.errorMessage = reason;
    this.updatedAt = new Date();
  }
}
