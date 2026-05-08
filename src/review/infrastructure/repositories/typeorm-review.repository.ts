import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { ReviewRepositoryPort } from '../../domain/ports/review-repository.port.js';
import { Review } from '../../domain/entities/review.entity.js';
import { ReviewRecord } from './review.record.js';
import { ReviewMapper } from './review.mapper.js';

@Injectable()
export class TypeOrmReviewRepository extends ReviewRepositoryPort {
  constructor(
    @InjectRepository(ReviewRecord)
    private readonly repo: TypeOrmRepo<ReviewRecord>,
  ) {
    super();
  }

  async save(review: Review): Promise<Review> {
    await this.repo.save(ReviewMapper.toRecord(review));
    return review;
  }

  async findByPrAndSha(
    repositoryId: string,
    prNumber: number,
    sha: string,
  ): Promise<Review | null> {
    const record = await this.repo.findOneBy({
      repository_id: repositoryId,
      pr_number: prNumber,
      pr_sha: sha,
    });
    return record ? ReviewMapper.toDomain(record) : null;
  }

  async deleteByRepositoryId(repositoryId: string): Promise<number> {
    const result = await this.repo.delete({ repository_id: repositoryId });
    return result.affected ?? 0;
  }

  async deleteByRepositoryIds(repositoryIds: string[]): Promise<number> {
    if (repositoryIds.length === 0) return 0;
    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .where('repository_id IN (:...ids)', { ids: repositoryIds })
      .execute();
    return result.affected ?? 0;
  }
}
