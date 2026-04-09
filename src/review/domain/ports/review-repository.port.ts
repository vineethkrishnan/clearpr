import { type Review } from '../entities/review.entity.js';

export abstract class ReviewRepositoryPort {
  abstract save(review: Review): Promise<Review>;
  abstract findByPrAndSha(repositoryId: string, prNumber: number, sha: string): Promise<Review | null>;
}
