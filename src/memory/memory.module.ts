import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrMemoryRecord } from './infrastructure/repositories/memory.record.js';
import { EmbeddingProviderPort } from './domain/ports/embedding-provider.port.js';
import { MemoryRepositoryPort } from './domain/ports/memory-repository.port.js';
import { VoyageEmbeddingAdapter } from './infrastructure/adapters/voyage-embedding.adapter.js';
import { TypeOrmMemoryRepository } from './infrastructure/repositories/typeorm-memory.repository.js';
import { MemoryIndexerService } from './application/use-cases/memory-indexer.use-case.js';
import { MemoryRetrieverService } from './application/use-cases/memory-retriever.use-case.js';
import { OutcomeDetectorService } from './application/use-cases/outcome-detector.use-case.js';
import { RepositoryIndexerService } from './application/use-cases/repository-indexer.use-case.js';
import { GitHubModule } from '../github/github.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([PrMemoryRecord]), GitHubModule],
  providers: [
    {
      provide: EmbeddingProviderPort,
      useClass: VoyageEmbeddingAdapter,
    },
    {
      provide: MemoryRepositoryPort,
      useClass: TypeOrmMemoryRepository,
    },
    MemoryIndexerService,
    MemoryRetrieverService,
    OutcomeDetectorService,
    RepositoryIndexerService,
  ],
  exports: [
    MemoryRetrieverService,
    MemoryIndexerService,
    MemoryRepositoryPort,
    RepositoryIndexerService,
  ],
})
export class MemoryModule {}
