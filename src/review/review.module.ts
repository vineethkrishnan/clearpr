import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitHubModule } from '../github/github.module.js';
import { DiffEngineModule } from '../diff-engine/diff-engine.module.js';
import { MemoryModule } from '../memory/memory.module.js';
import { ReviewSchema } from './infrastructure/repositories/review.schema.js';
import { TypeOrmReviewRepository } from './infrastructure/repositories/typeorm-review.repository.js';
import { ReviewRepositoryPort } from './domain/ports/review-repository.port.js';
import { ReviewPosterPort } from './domain/ports/review-poster.port.js';
import { PrFileListProviderPort } from './domain/ports/pr-file-list-provider.port.js';
import { GitHubReviewPosterAdapter } from './infrastructure/adapters/github-review-poster.adapter.js';
import { GitHubPrFileListAdapter } from './infrastructure/adapters/github-pr-file-list.adapter.js';
import { createLlmProvider } from './infrastructure/llm/llm-provider.registry.js';
import { PromptSanitizer } from './application/services/prompt-sanitizer.service.js';
import { GuidelineLoaderService } from './application/services/guideline-loader.service.js';
import { PromptBuilderService } from './application/services/prompt-builder.service.js';
import { ReviewOrchestratorService } from './application/services/review-orchestrator.service.js';
import { IgnoreListService } from './application/services/ignore-list.service.js';
import { CommandHandlerService } from './application/services/command-handler.service.js';
import { InstallationCleanupService } from './application/services/installation-cleanup.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewSchema]), GitHubModule, DiffEngineModule, MemoryModule],
  providers: [
    createLlmProvider(),
    {
      provide: ReviewRepositoryPort,
      useClass: TypeOrmReviewRepository,
    },
    {
      provide: ReviewPosterPort,
      useClass: GitHubReviewPosterAdapter,
    },
    {
      provide: PrFileListProviderPort,
      useClass: GitHubPrFileListAdapter,
    },
    PromptSanitizer,
    GuidelineLoaderService,
    PromptBuilderService,
    IgnoreListService,
    ReviewOrchestratorService,
    CommandHandlerService,
    InstallationCleanupService,
  ],
  exports: [
    ReviewOrchestratorService,
    IgnoreListService,
    CommandHandlerService,
    InstallationCleanupService,
  ],
})
export class ReviewModule {}
