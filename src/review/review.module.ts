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
import { PromptSanitizer } from './application/use-cases/prompt-sanitizer.use-case.js';
import { GuidelineLoaderService } from './application/use-cases/guideline-loader.use-case.js';
import { PromptBuilderService } from './application/use-cases/prompt-builder.use-case.js';
import { ReviewOrchestratorService } from './application/use-cases/review-orchestrator.use-case.js';
import { IgnoreListService } from './application/use-cases/ignore-list.use-case.js';
import { CommandHandlerService } from './application/use-cases/command-handler.use-case.js';
import { InstallationCleanupService } from './application/use-cases/installation-cleanup.use-case.js';
import { ParseLlmResponseUseCase } from './application/use-cases/parse-llm-response.use-case.js';

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
    ParseLlmResponseUseCase,
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
