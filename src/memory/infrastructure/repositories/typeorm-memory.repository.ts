import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import pgvector from 'pgvector';

const toVectorSql = (vector: number[]): string => pgvector.toSql(vector) as string;
const fromVectorSql = (raw: string): number[] => (pgvector.fromSql(raw) as number[] | null) ?? [];
import {
  MemoryRepositoryPort,
  type SimilarMemoryResult,
} from '../../domain/ports/memory-repository.port.js';
import { PrMemoryEntry } from '../../domain/entities/pr-memory-entry.entity.js';
import { PrMemoryRecord } from './memory.record.js';
import { PrMemoryMapper } from './memory.mapper.js';

interface SimilarityRow extends PrMemoryRecord {
  similarity: string;
}

@Injectable()
export class TypeOrmMemoryRepository extends MemoryRepositoryPort {
  constructor(
    @InjectRepository(PrMemoryRecord)
    private readonly repo: TypeOrmRepo<PrMemoryRecord>,
  ) {
    super();
  }

  async save(entry: PrMemoryEntry): Promise<void> {
    await this.repo.save(PrMemoryMapper.toRecord(entry, toVectorSql(entry.embedding)));
  }

  async saveBatch(entries: PrMemoryEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await this.repo.save(
      entries.map((entry) => PrMemoryMapper.toRecord(entry, toVectorSql(entry.embedding))),
    );
  }

  async findSimilar(
    repositoryId: string,
    embedding: number[],
    limit: number,
    threshold: number,
  ): Promise<SimilarMemoryResult[]> {
    // pgvector cosine distance is 0..2; similarity = 1 - distance.
    const maxDistance = 1 - threshold;
    const queryEmbedding = toVectorSql(embedding);

    const rows: SimilarityRow[] = await this.repo.query(
      `SELECT id, repository_id, pr_number, comment_author, comment_text,
              code_context, outcome, embedding, created_at,
              1 - (embedding <=> $1::vector) AS similarity
       FROM pr_memory
       WHERE repository_id = $2
         AND (embedding <=> $1::vector) <= $3
       ORDER BY embedding <=> $1::vector
       LIMIT $4`,
      [queryEmbedding, repositoryId, maxDistance, limit],
    );

    return rows.map((row) => ({
      entry: PrMemoryMapper.toDomain(row, fromVectorSql(row.embedding)),
      similarity: parseFloat(row.similarity),
    }));
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
