import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitHubModule } from '../github/github.module.js';
import { DiffEngineModule } from '../diff-engine/diff-engine.module.js';
import { MemoryModule } from '../memory/memory.module.js';
import { ReviewRecord } from './infrastructure/repositories/review.record.js';
import { TypeOrmReviewRepository } from './infrastructure/repositories/typeorm-review.repository.js';
import { ReviewRepositoryPort } from './domain/ports/review-repository.port.js';
import { ReviewPosterPort } from './domain/ports/review-poster.port.js';
import { PrFileListProviderPort } from './domain/ports/pr-file-list-provider.port.js';
import { GitHubReviewPosterAdapter } from './infrastructure/adapters/github-review-poster.adapter.js';
import { GitHubPrFileListAdapter } from './infrastructure/adapters/github-pr-file-list.adapter.js';
import { createLlmProvider } from './infrastructure/llm/llm-provider.registry.js';
import { PromptSanitizer } from './application/use-cases/prompt-sanitizer.use-case.js';
import { LoadGuidelinesUseCase } from './application/use-cases/load-guidelines.use-case.js';
import { PromptBuilderService } from './application/use-cases/prompt-builder.use-case.js';
import { ReviewOrchestratorService } from './application/use-cases/review-orchestrator.use-case.js';
import { ManageIgnorePatternsUseCase } from './application/use-cases/manage-ignore-patterns.use-case.js';
import { HandleCommandUseCase } from './application/use-cases/handle-command.use-case.js';
import { CleanupInstallationUseCase } from './application/use-cases/cleanup-installation.use-case.js';
import { ParseLlmResponseUseCase } from './application/use-cases/parse-llm-response.use-case.js';
import { BuildReviewSummaryUseCase } from './application/use-cases/build-review-summary.use-case.js';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewRecord]), GitHubModule, DiffEngineModule, MemoryModule],
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
    LoadGuidelinesUseCase,
    PromptBuilderService,
    ManageIgnorePatternsUseCase,
    ParseLlmResponseUseCase,
    BuildReviewSummaryUseCase,
    ReviewOrchestratorService,
    HandleCommandUseCase,
    CleanupInstallationUseCase,
  ],
  exports: [
    ReviewOrchestratorService,
    ManageIgnorePatternsUseCase,
    HandleCommandUseCase,
    CleanupInstallationUseCase,
  ],
})
export class ReviewModule {}
