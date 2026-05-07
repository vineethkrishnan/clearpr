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
import { MemoryRetrieverPort } from './application/ports/memory-retriever.port.js';
import { DiffComputerPort } from './application/ports/diff-computer.port.js';
import { GitHubReviewPosterAdapter } from './infrastructure/adapters/github-review-poster.adapter.js';
import { GitHubPrFileListAdapter } from './infrastructure/adapters/github-pr-file-list.adapter.js';
import { RetrieveMemoryUseCase } from '../memory/application/use-cases/retrieve-memory.use-case.js';
import { ComputeSemanticDiffUseCase } from '../diff-engine/application/use-cases/compute-semantic-diff.use-case.js';
import { createLlmProvider } from './infrastructure/llm/llm-provider.registry.js';
import { PromptSanitizer } from './application/use-cases/prompt-sanitizer.use-case.js';
import { LoadGuidelinesUseCase } from './application/use-cases/load-guidelines.use-case.js';
import { BuildPromptUseCase } from './application/use-cases/build-prompt.use-case.js';
import { OrchestrateReviewUseCase } from './application/use-cases/orchestrate-review.use-case.js';
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
    {
      provide: MemoryRetrieverPort,
      useExisting: RetrieveMemoryUseCase,
    },
    {
      provide: DiffComputerPort,
      useExisting: ComputeSemanticDiffUseCase,
    },
    PromptSanitizer,
    LoadGuidelinesUseCase,
    BuildPromptUseCase,
    ManageIgnorePatternsUseCase,
    ParseLlmResponseUseCase,
    BuildReviewSummaryUseCase,
    OrchestrateReviewUseCase,
    HandleCommandUseCase,
    CleanupInstallationUseCase,
  ],
  exports: [
    OrchestrateReviewUseCase,
    ManageIgnorePatternsUseCase,
    HandleCommandUseCase,
    CleanupInstallationUseCase,
  ],
})
export class ReviewModule {}
