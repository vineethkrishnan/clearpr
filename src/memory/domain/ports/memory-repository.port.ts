import { type PrMemoryEntry } from '../entities/pr-memory-entry.entity.js';

export interface SimilarMemoryResult {
  entry: PrMemoryEntry;
  similarity: number;
}

export abstract class MemoryRepositoryPort {
  abstract save(entry: PrMemoryEntry): Promise<void>;
  abstract saveBatch(entries: PrMemoryEntry[]): Promise<void>;
  abstract findSimilar(repositoryId: string, embedding: number[], limit: number, threshold: number): Promise<SimilarMemoryResult[]>;
}
