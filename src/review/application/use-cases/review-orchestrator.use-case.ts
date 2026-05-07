import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderPort } from '../../domain/ports/llm-provider.port.js';
import { ReviewRepositoryPort } from '../../domain/ports/review-repository.port.js';
import { ReviewPosterPort } from '../../domain/ports/review-poster.port.js';
import { Review } from '../../domain/entities/review.entity.js';
import { ReviewComment } from '../../domain/entities/review-comment.entity.js';
import { ReviewTrigger } from '../../domain/value-objects/review-trigger.vo.js';
import { ReviewSkippedError } from '../../domain/errors/review.errors.js';
import { RESPONSE_TOKENS } from '../../domain/value-objects/token-budget.vo.js';
import { PrFileListProviderPort } from '../../domain/ports/pr-file-list-provider.port.js';
import { SemanticDiffService } from '../../../diff-engine/application/use-cases/semantic-diff.use-case.js';
import { GuidelineLoaderService } from './guideline-loader.use-case.js';
import { PromptBuilderService } from './prompt-builder.use-case.js';
import { IgnoreListService } from './ignore-list.use-case.js';
import { ParseLlmResponseUseCase } from './parse-llm-response.use-case.js';
import { BuildReviewSummaryUseCase } from './build-review-summary.use-case.js';
import { matchesAnyPattern } from './glob-match.util.js';
import { MemoryRetrieverService } from '../../../memory/application/use-cases/memory-retriever.use-case.js';
import type { ReviewContext } from '../../domain/types/review-context.types.js';
import { type Result, ok, err } from '../../../shared/types/result.types.js';
import { type DomainError } from '../../../shared/domain/errors/domain-error.base.js';
import { AppConfig } from '../../../config/app.config.js';

@Injectable()
export class ReviewOrchestratorService {
  private readonly logger = new Logger(ReviewOrchestratorService.name);

  constructor(
    private readonly diffService: SemanticDiffService,
    private readonly guidelineLoader: GuidelineLoaderService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly llmProvider: LlmProviderPort,
    private readonly reviewRepo: ReviewRepositoryPort,
    private readonly reviewPoster: ReviewPosterPort,
    private readonly prFileListProvider: PrFileListProviderPort,
    private readonly memoryRetriever: MemoryRetrieverService,
    private readonly ignoreList: IgnoreListService,
    private readonly parseLlmResponse: ParseLlmResponseUseCase,
    private readonly buildReviewSummary: BuildReviewSummaryUseCase,
    private readonly config: AppConfig,
  ) {}

  async execute(
    context: ReviewContext,
    triggerType: 'auto' | 'manual' = 'auto',
  ): Promise<Result<Review, DomainError>> {
    const startTime = Date.now();
    const trigger = triggerType === 'manual' ? ReviewTrigger.MANUAL : ReviewTrigger.AUTO;

    const review = Review.create({
      repositoryId: context.repositoryId,
      prNumber: context.prNumber,
      prSha: context.prSha,
      trigger,
    });

    review.markProcessing();
    await this.reviewRepo.save(review);

    try {
      // Fetch PR file list
      const prFiles = await this.prFileListProvider.getPrFiles(
        context.installationId,
        context.owner,
        context.repo,
        context.prNumber,
      );

      // Apply per-PR ignore patterns stored in Redis (via @clearpr ignore)
      const ignorePatterns = await this.ignoreList.getPatterns(
        context.repositoryId,
        context.prNumber,
      );
      const filteredFiles =
        ignorePatterns.length > 0
          ? prFiles.filter((f) => !matchesAnyPattern(f.filename, ignorePatterns))
          : prFiles;

      // Compute semantic diff
      const diffResult = await this.diffService.computeDiff({
        installationId: context.installationId,
        repositoryId: context.repositoryId,
        owner: context.owner,
        repo: context.repo,
        baseSha: context.baseBranch,
        headSha: context.prSha,
        files: filteredFiles,
      });

      // Check size limit
      const isDiffTooLarge = diffResult.totalSemanticLines > this.config.MAX_DIFF_LINES;
      if (isDiffTooLarge) {
        const skipReason = `Semantic diff has ${diffResult.totalSemanticLines} lines, exceeding limit of ${this.config.MAX_DIFF_LINES}`;
        review.markSkipped(skipReason);
        await this.reviewRepo.save(review);
        await this.reviewPoster.postSummary(
          context,
          `**ClearPR** — Review skipped: this PR has ${diffResult.totalSemanticLines} semantic diff lines, exceeding the ${this.config.MAX_DIFF_LINES} line limit.`,
        );
        return err(new ReviewSkippedError(skipReason));
      }

      // Load guidelines
      const guidelines = await this.guidelineLoader.load(
        context.repositoryId,
        context.installationId,
        context.owner,
        context.repo,
        context.baseBranch,
      );

      // Retrieve relevant past feedback from memory
      const diffSummary = diffResult.files
        .filter((f) => f.semanticLines > 0)
        .map((f) => `${f.filePath}: ${f.semanticLines} lines changed`)
        .join('\n');
      const memoryContext = await this.memoryRetriever.findRelevant(
        context.repositoryId,
        diffSummary,
      );

      // Build prompt
      const prompt = this.promptBuilder.build({
        diff: diffResult,
        guidelines,
        memoryContext,
      });

      // Call LLM
      const llmResponse = await this.llmProvider.generateReview(prompt, RESPONSE_TOKENS);

      // Parse response
      const parsed = this.parseLlmResponse.execute(llmResponse.content);

      // Create review comments
      const comments = parsed.comments.map(
        (c) =>
          new ReviewComment({
            reviewId: review.id,
            filePath: c.path,
            line: c.line,
            side: c.side,
            severity: c.severity,
            body: c.body,
          }),
      );

      review.comments = comments;

      // Post to GitHub
      if (comments.length > 0) {
        await this.reviewPoster.postInlineComments(context, comments);
      }

      // Build and post summary
      const summary = this.buildReviewSummary.execute({
        diff: diffResult,
        parsed,
        hasGuidelines: guidelines !== null,
      });
      await this.reviewPoster.postSummary(context, summary);

      // Mark completed
      review.markCompleted({
        rawDiffLines: diffResult.totalRawLines,
        semanticDiffLines: diffResult.totalSemanticLines,
        noiseReductionPct: diffResult.noiseReductionPct,
        modelUsed: llmResponse.model,
        promptTokens: llmResponse.promptTokens,
        completionTokens: llmResponse.completionTokens,
        durationMs: Date.now() - startTime,
      });
      await this.reviewRepo.save(review);

      this.logger.log(
        {
          reviewId: review.id,
          prNumber: context.prNumber,
          findings: comments.length,
          durationMs: Date.now() - startTime,
        },
        `Review completed: ${comments.length} findings`,
      );

      return ok(review);
    } catch (error) {
      this.logger.error(
        { reviewId: review.id, prNumber: context.prNumber },
        `Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
