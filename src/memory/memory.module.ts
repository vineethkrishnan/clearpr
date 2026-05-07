import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrMemoryRecord } from './infrastructure/repositories/memory.record.js';
import { EmbeddingProviderPort } from './domain/ports/embedding-provider.port.js';
import { MemoryRepositoryPort } from './domain/ports/memory-repository.port.js';
import { VoyageEmbeddingAdapter } from './infrastructure/adapters/voyage-embedding.adapter.js';
import { TypeOrmMemoryRepository } from './infrastructure/repositories/typeorm-memory.repository.js';
import { IndexMemoryUseCase } from './application/use-cases/index-memory.use-case.js';
import { RetrieveMemoryUseCase } from './application/use-cases/retrieve-memory.use-case.js';
import { OutcomeDetectorService } from './application/use-cases/outcome-detector.use-case.js';
import { IndexRepositoryUseCase } from './application/use-cases/index-repository.use-case.js';
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
    IndexMemoryUseCase,
    RetrieveMemoryUseCase,
    OutcomeDetectorService,
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
