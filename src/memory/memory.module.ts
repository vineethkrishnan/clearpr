import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrMemorySchema } from './infrastructure/repositories/memory.schema.js';
import { EmbeddingProviderPort } from './domain/ports/embedding-provider.port.js';
import { MemoryRepositoryPort } from './domain/ports/memory-repository.port.js';
import { VoyageEmbeddingAdapter } from './infrastructure/adapters/voyage-embedding.adapter.js';
import { TypeOrmMemoryRepository } from './infrastructure/repositories/typeorm-memory.repository.js';
import { MemoryIndexerService } from './application/services/memory-indexer.service.js';
import { MemoryRetrieverService } from './application/services/memory-retriever.service.js';
import { OutcomeDetectorService } from './application/services/outcome-detector.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PrMemorySchema])],
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
  ],
  exports: [MemoryRetrieverService, MemoryIndexerService],
})
export class MemoryModule {}
