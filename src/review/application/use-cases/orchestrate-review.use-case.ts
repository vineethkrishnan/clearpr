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
import { ComputeSemanticDiffUseCase } from '../../../diff-engine/application/use-cases/compute-semantic-diff.use-case.js';
import { DiffTooLargeError } from '../../../diff-engine/domain/errors/diff-engine.errors.js';
import type { SemanticDiffResult } from '../../../diff-engine/application/types/diff-result.types.js';
import { LoadGuidelinesUseCase } from './load-guidelines.use-case.js';
import { BuildPromptUseCase } from './build-prompt.use-case.js';
import { ManageIgnorePatternsUseCase } from './manage-ignore-patterns.use-case.js';
import { ParseLlmResponseUseCase } from './parse-llm-response.use-case.js';
import { BuildReviewSummaryUseCase } from './build-review-summary.use-case.js';
import { matchesAnyPattern } from './glob-match.util.js';
import { MemoryRetrieverPort } from '../ports/memory-retriever.port.js';
import type { ReviewContext } from '../../domain/types/review-context.types.js';
import { type Result, ok, err } from '../../../shared/types/result.types.js';
import { type DomainError } from '../../../shared/domain/errors/domain-error.base.js';

@Injectable()
export class OrchestrateReviewUseCase {
  private readonly logger = new Logger(OrchestrateReviewUseCase.name);

  constructor(
    private readonly diffService: ComputeSemanticDiffUseCase,
    private readonly guidelineLoader: LoadGuidelinesUseCase,
    private readonly promptBuilder: BuildPromptUseCase,
    private readonly llmProvider: LlmProviderPort,
    private readonly reviewRepo: ReviewRepositoryPort,
    private readonly reviewPoster: ReviewPosterPort,
    private readonly prFileListProvider: PrFileListProviderPort,
    private readonly memoryRetriever: MemoryRetrieverPort,
    private readonly ignoreList: ManageIgnorePatternsUseCase,
    private readonly parseLlmResponse: ParseLlmResponseUseCase,
    private readonly buildReviewSummary: BuildReviewSummaryUseCase,
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

      // Compute semantic diff. The diff engine throws DiffTooLargeError when
      // the configured MAX_DIFF_LINES budget is exceeded; we translate that
      // into the orchestrator's skip-and-comment path.
      let diffResult: SemanticDiffResult;
      try {
        diffResult = await this.diffService.computeDiff({
          installationId: context.installationId,
          repositoryId: context.repositoryId,
          owner: context.owner,
          repo: context.repo,
          baseSha: context.baseBranch,
          headSha: context.prSha,
          files: filteredFiles,
        });
      } catch (diffError) {
        if (diffError instanceof DiffTooLargeError) {
          review.markSkipped(diffError.message);
          await this.reviewRepo.save(review);
          await this.reviewPoster.postSummary(
            context,
            `**ClearPR** — Review skipped: ${diffError.message.toLowerCase()}.`,
          );
          return err(new ReviewSkippedError(diffError.message));
        }
        throw diffError;
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
