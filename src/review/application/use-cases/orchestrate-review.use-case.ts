import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderPort } from '../../domain/ports/llm-provider.port.js';
import { ReviewRepositoryPort } from '../../domain/ports/review-repository.port.js';
import { ReviewPosterPort } from '../../domain/ports/review-poster.port.js';
import {
  CheckRunPosterPort,
  type CheckRunConclusion,
} from '../../domain/ports/check-run-poster.port.js';
import { Review } from '../../domain/entities/review.entity.js';
import { ReviewComment } from '../../domain/entities/review-comment.entity.js';
import { ReviewTrigger } from '../../domain/value-objects/review-trigger.vo.js';
import { ReviewSkippedError } from '../../domain/errors/review.errors.js';
import { RESPONSE_TOKENS } from '../../domain/value-objects/token-budget.vo.js';
import { PrFileListProviderPort } from '../../domain/ports/pr-file-list-provider.port.js';
import { DiffTooLargeError } from '../../../diff-engine/domain/errors/diff-engine.errors.js';
import type { SemanticDiffResult } from '../../../diff-engine/application/types/diff-result.types.js';
import { DiffComputerPort } from '../ports/diff-computer.port.js';
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
    private readonly diffService: DiffComputerPort,
    private readonly guidelineLoader: LoadGuidelinesUseCase,
    private readonly promptBuilder: BuildPromptUseCase,
    private readonly llmProvider: LlmProviderPort,
    private readonly reviewRepo: ReviewRepositoryPort,
    private readonly reviewPoster: ReviewPosterPort,
    private readonly checkRunPoster: CheckRunPosterPort,
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
      await this.announceInProgress(context, review);

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
          await this.publishSummary(
            context,
            review,
            `**ClearPR** — Review skipped: ${diffError.message.toLowerCase()}.`,
          );
          await this.completeCheck(context, review, 'neutral', {
            title: 'Review skipped',
            summary: diffError.message,
          });
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
      const inlineAnchored =
        comments.length > 0 ? await this.reviewPoster.postInlineComments(context, comments) : true;

      // Build and post summary
      const summary = this.buildReviewSummary.execute({
        diff: diffResult,
        parsed,
        hasGuidelines: guidelines !== null,
        inlineAnchored,
      });
      await this.publishSummary(context, review, summary);

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

      const conclusion: CheckRunConclusion = comments.length === 0 ? 'success' : 'neutral';
      const checkTitle =
        comments.length === 0
          ? 'No findings'
          : `${comments.length} finding${comments.length === 1 ? '' : 's'}`;
      await this.completeCheck(context, review, conclusion, {
        title: checkTitle,
        summary: `${diffResult.totalRawLines} raw lines analysed (${diffResult.noiseReductionPct}% noise filtered).`,
      });

      return ok(review);
    } catch (error) {
      this.logger.error(
        { reviewId: review.id, prNumber: context.prNumber },
        `Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.publishSummary(context, review, `**ClearPR** — Review failed: ${message}.`).catch(
        () => {},
      );
      await this.completeCheck(context, review, 'failure', {
        title: 'Review failed',
        summary: message,
      }).catch(() => {});
      throw error;
    }
  }

  private async announceInProgress(context: ReviewContext, review: Review): Promise<void> {
    try {
      review.progressCommentId = await this.reviewPoster.postProgressPlaceholder(context);
      await this.reviewRepo.save(review);
    } catch (error) {
      this.logger.warn(
        { reviewId: review.id, error: error instanceof Error ? error.message : 'unknown' },
        'Failed to post progress placeholder; review will post a fresh summary at completion',
      );
    }

    try {
      review.checkRunId = await this.checkRunPoster.createInProgress(context);
      await this.reviewRepo.save(review);
    } catch (error) {
      this.logger.warn(
        { reviewId: review.id, error: error instanceof Error ? error.message : 'unknown' },
        'Failed to create check run; review will continue without a check status',
      );
    }
  }

  private async completeCheck(
    context: ReviewContext,
    review: Review,
    conclusion: CheckRunConclusion,
    output: { title: string; summary: string },
  ): Promise<void> {
    if (review.checkRunId === undefined) return;
    try {
      await this.checkRunPoster.complete(context, review.checkRunId, conclusion, output);
    } catch (error) {
      this.logger.warn(
        {
          reviewId: review.id,
          checkRunId: review.checkRunId,
          error: error instanceof Error ? error.message : 'unknown',
        },
        'Failed to complete check run; status will remain in_progress until GitHub times it out',
      );
    }
  }

  private async publishSummary(
    context: ReviewContext,
    review: Review,
    body: string,
  ): Promise<void> {
    if (review.progressCommentId !== undefined) {
      try {
        await this.reviewPoster.updateSummary(context, review.progressCommentId, body);
        return;
      } catch (error) {
        this.logger.warn(
          {
            reviewId: review.id,
            commentId: review.progressCommentId,
            error: error instanceof Error ? error.message : 'unknown',
          },
          'Failed to edit progress placeholder; falling back to a fresh summary comment',
        );
      }
    }
    await this.reviewPoster.postSummary(context, body);
  }
}
