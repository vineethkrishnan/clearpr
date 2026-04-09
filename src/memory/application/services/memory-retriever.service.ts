import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingProviderPort } from '../../domain/ports/embedding-provider.port.js';
import { MemoryRepositoryPort } from '../../domain/ports/memory-repository.port.js';
import { FeedbackOutcome } from '../../domain/value-objects/feedback-outcome.vo.js';
import { AppConfig } from '../../../config/app.config.js';

@Injectable()
export class MemoryRetrieverService {
  private readonly logger = new Logger(MemoryRetrieverService.name);

  constructor(
    private readonly embeddingProvider: EmbeddingProviderPort,
    private readonly memoryRepo: MemoryRepositoryPort,
    private readonly config: AppConfig,
  ) {}

  async findRelevant(repositoryId: string, diffSummary: string): Promise<string | null> {
    try {
      const embedding = await this.embeddingProvider.embed(diffSummary);

      const results = await this.memoryRepo.findSimilar(
        repositoryId,
        embedding,
        5,
        this.config.SIMILARITY_THRESHOLD,
      );

      // Filter to accepted feedback only
      const accepted = results.filter((r) => r.entry.outcome === FeedbackOutcome.ACCEPTED);

      if (accepted.length === 0) return null;

      const context = accepted
        .map((r) => {
          return `[PR #${r.entry.prNumber}, similarity: ${(r.similarity * 100).toFixed(0)}%]\n${r.entry.commentText}\nContext: ${r.entry.codeContext}`;
        })
        .join('\n\n---\n\n');

      this.logger.debug(
        { repositoryId, matchCount: accepted.length },
        `Found ${accepted.length} relevant past feedback entries`,
      );

      return context;
    } catch (error) {
      this.logger.warn(
        { repositoryId },
        `Memory retrieval failed — proceeding without memory context: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }
}
