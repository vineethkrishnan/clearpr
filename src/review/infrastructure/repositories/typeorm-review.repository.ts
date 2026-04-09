import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { ReviewRepositoryPort } from '../../domain/ports/review-repository.port.js';
import { Review } from '../../domain/entities/review.entity.js';
import { ReviewStatus } from '../../domain/value-objects/review-status.vo.js';
import { ReviewTrigger } from '../../domain/value-objects/review-trigger.vo.js';
import { ReviewSchema, type ReviewRow } from './review.schema.js';

@Injectable()
export class TypeOrmReviewRepository extends ReviewRepositoryPort {
  constructor(
    @InjectRepository(ReviewSchema)
    private readonly repo: TypeOrmRepo<ReviewRow>,
  ) {
    super();
  }

  async save(review: Review): Promise<Review> {
    await this.repo.save(this.toRow(review));
    return review;
  }

  async findByPrAndSha(repositoryId: string, prNumber: number, sha: string): Promise<Review | null> {
    const row = await this.repo.findOneBy({
      repository_id: repositoryId,
      pr_number: prNumber,
      pr_sha: sha,
    });
    return row ? this.toDomain(row) : null;
  }

  private toRow(entity: Review): ReviewRow {
    return {
      id: entity.id,
      repository_id: entity.repositoryId,
      pr_number: entity.prNumber,
      pr_sha: entity.prSha,
      trigger: entity.trigger,
      status: entity.status,
      raw_diff_lines: entity.rawDiffLines ?? null,
      semantic_diff_lines: entity.semanticDiffLines ?? null,
      noise_reduction_pct: entity.noiseReductionPct ?? null,
      model_used: entity.modelUsed ?? null,
      prompt_tokens: entity.promptTokens ?? null,
      completion_tokens: entity.completionTokens ?? null,
      review_duration_ms: entity.reviewDurationMs ?? null,
      error_message: entity.errorMessage ?? null,
      created_at: entity.createdAt,
    };
  }

  private toDomain(row: ReviewRow): Review {
    return Review.reconstitute({
      id: row.id,
      repositoryId: row.repository_id,
      prNumber: row.pr_number,
      prSha: row.pr_sha,
      trigger: row.trigger as ReviewTrigger,
      status: row.status as ReviewStatus,
    });
  }
}
