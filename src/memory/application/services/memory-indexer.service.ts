import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingProviderPort } from '../../domain/ports/embedding-provider.port.js';
import { MemoryRepositoryPort } from '../../domain/ports/memory-repository.port.js';
import { PrMemoryEntry } from '../../domain/entities/pr-memory-entry.entity.js';
import { type FeedbackOutcome } from '../../domain/value-objects/feedback-outcome.vo.js';

export interface IndexableComment {
  prNumber: number;
  commentAuthor: string;
  commentText: string;
  codeContext: string;
  outcome: FeedbackOutcome;
}

@Injectable()
export class MemoryIndexerService {
  private readonly logger = new Logger(MemoryIndexerService.name);

  constructor(
    private readonly embeddingProvider: EmbeddingProviderPort,
    private readonly memoryRepo: MemoryRepositoryPort,
  ) {}

  async indexComments(
    repositoryId: string,
    comments: IndexableComment[],
  ): Promise<number> {
    if (comments.length === 0) return 0;

    // Batch embed all comments
    const texts = comments.map((c) => `${c.commentText}\n${c.codeContext}`);
    const embeddings = await this.embeddingProvider.embedBatch(texts);

    const entries = comments.map(
      (c, i) =>
        new PrMemoryEntry({
          repositoryId,
          prNumber: c.prNumber,
          commentAuthor: c.commentAuthor,
          commentText: c.commentText,
          codeContext: c.codeContext,
          outcome: c.outcome,
          embedding: embeddings[i] ?? [],
        }),
    );

    await this.memoryRepo.saveBatch(entries);

    this.logger.log(
      { repositoryId, count: entries.length },
      `Indexed ${entries.length} review comments`,
    );

    return entries.length;
  }
}
