import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrMemoryRecord } from './infrastructure/repositories/memory.record.js';
import { AppConfig, EmbeddingProvider } from '../config/app.config.js';
import { EmbeddingProviderPort } from './domain/ports/embedding-provider.port.js';
import { MemoryRepositoryPort } from './domain/ports/memory-repository.port.js';
import { PrHistoryProviderPort } from './application/ports/pr-history-provider.port.js';
import { VoyageEmbeddingAdapter } from './infrastructure/adapters/voyage-embedding.adapter.js';
import { LocalEmbeddingAdapter } from './infrastructure/adapters/local-embedding.adapter.js';
import { GithubPrHistoryAdapter } from './infrastructure/adapters/github-pr-history.adapter.js';
import { TypeOrmMemoryRepository } from './infrastructure/repositories/typeorm-memory.repository.js';
import { IndexMemoryUseCase } from './application/use-cases/index-memory.use-case.js';
import { RetrieveMemoryUseCase } from './application/use-cases/retrieve-memory.use-case.js';
import { DetectFeedbackOutcomeUseCase } from './application/use-cases/detect-feedback-outcome.use-case.js';
import { IndexRepositoryUseCase } from './application/use-cases/index-repository.use-case.js';
import { GitHubModule } from '../github/github.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([PrMemoryRecord]), GitHubModule],
  providers: [
    {
      provide: EmbeddingProviderPort,
      inject: [AppConfig],
      useFactory: (config: AppConfig): EmbeddingProviderPort =>
        config.EMBEDDING_PROVIDER === EmbeddingProvider.LOCAL
          ? new LocalEmbeddingAdapter(config)
          : new VoyageEmbeddingAdapter(config),
    },
    {
      provide: MemoryRepositoryPort,
      useClass: TypeOrmMemoryRepository,
    },
    {
      provide: PrHistoryProviderPort,
      useClass: GithubPrHistoryAdapter,
    },
    IndexMemoryUseCase,
    RetrieveMemoryUseCase,
    DetectFeedbackOutcomeUseCase,
    IndexRepositoryUseCase,
  ],
  exports: [
    RetrieveMemoryUseCase,
    IndexMemoryUseCase,
    MemoryRepositoryPort,
    IndexRepositoryUseCase,
  ],
})
export class MemoryModule {}
