import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import {
  MemoryRepositoryPort,
  type SimilarMemoryResult,
} from '../../domain/ports/memory-repository.port.js';
import { PrMemoryEntry } from '../../domain/entities/pr-memory-entry.entity.js';
import { type FeedbackOutcome } from '../../domain/value-objects/feedback-outcome.vo.js';
import { PrMemorySchema, type PrMemoryRow } from './memory.schema.js';

@Injectable()
export class TypeOrmMemoryRepository extends MemoryRepositoryPort {
  constructor(
    @InjectRepository(PrMemorySchema)
    private readonly repo: TypeOrmRepo<PrMemoryRow>,
  ) {
    super();
  }

  async save(entry: PrMemoryEntry): Promise<void> {
    await this.repo.save(this.toRow(entry));
  }

  async saveBatch(entries: PrMemoryEntry[]): Promise<void> {
    await this.repo.save(entries.map((e) => this.toRow(e)));
  }

  async findSimilar(
    repositoryId: string,
    embedding: number[],
    limit: number,
    _threshold: number,
  ): Promise<SimilarMemoryResult[]> {
    // pgvector cosine distance query
    // Note: This uses raw SQL because TypeORM doesn't natively support vector operations.
    // The embedding column stores vectors as text (JSON array) for portability.
    // In production with pgvector extension, this would use: embedding <=> $1
    const rows = await this.repo
      .createQueryBuilder('pm')
      .where('pm.repository_id = :repositoryId', { repositoryId })
      .orderBy('pm.created_at', 'DESC')
      .limit(limit)
      .getMany();

    // Simple in-memory cosine similarity (pgvector would do this natively)
    return rows
      .map((row) => {
        const entry = this.toDomain(row);
        const similarity = this.cosineSimilarity(embedding, entry.embedding);
        return { entry, similarity };
      })
      .filter((r) => r.similarity >= _threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
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

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
      normA += (a[i] ?? 0) ** 2;
      normB += (b[i] ?? 0) ** 2;
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private toRow(entry: PrMemoryEntry): PrMemoryRow {
    return {
      id: entry.id,
      repository_id: entry.repositoryId,
      pr_number: entry.prNumber,
      comment_author: entry.commentAuthor,
      comment_text: entry.commentText,
      code_context: entry.codeContext,
      outcome: entry.outcome,
      embedding: JSON.stringify(entry.embedding),
      created_at: entry.createdAt,
    };
  }

  private toDomain(row: PrMemoryRow): PrMemoryEntry {
    return new PrMemoryEntry({
      id: row.id,
      repositoryId: row.repository_id,
      prNumber: row.pr_number,
      commentAuthor: row.comment_author,
      commentText: row.comment_text,
      codeContext: row.code_context,
      outcome: row.outcome as FeedbackOutcome,
      embedding: JSON.parse(row.embedding) as number[],
    });
  }
}
