import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderPort } from '../../domain/ports/llm-provider.port.js';
import { ReviewRepositoryPort } from '../../domain/ports/review-repository.port.js';
import { ReviewPosterPort } from '../../domain/ports/review-poster.port.js';
import { Review } from '../../domain/entities/review.entity.js';
import { ReviewComment } from '../../domain/entities/review-comment.entity.js';
import { Severity } from '../../domain/value-objects/severity.vo.js';
import { ReviewTrigger } from '../../domain/value-objects/review-trigger.vo.js';
import { MalformedLlmResponseError, ReviewSkippedError } from '../../domain/errors/review.errors.js';
import { RESPONSE_TOKENS } from '../../domain/value-objects/token-budget.vo.js';
import { PrFileListProviderPort } from '../../domain/ports/pr-file-list-provider.port.js';
import { SemanticDiffService } from '../../../diff-engine/application/services/semantic-diff.service.js';
import { GuidelineLoaderService } from './guideline-loader.service.js';
import { PromptBuilderService } from './prompt-builder.service.js';
import { MemoryRetrieverService } from '../../../memory/application/services/memory-retriever.service.js';
import type { ReviewContext } from '../../domain/types/review-context.types.js';
import type { ParsedReview, ParsedReviewComment } from '../../application/types/review-result.types.js';
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

      // Compute semantic diff
      const diffResult = await this.diffService.computeDiff({
        installationId: context.installationId,
        repositoryId: context.repositoryId,
        owner: context.owner,
        repo: context.repo,
        baseSha: context.baseBranch,
        headSha: context.prSha,
        files: prFiles,
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
      const parsed = this.parseResponse(llmResponse.content);

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
      const summary = this.buildSummary(diffResult, parsed, guidelines !== null);
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

  private parseResponse(content: string): ParsedReview {
    try {
      // Extract JSON from response (may have markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]) as {
        comments?: Array<{
          path?: string;
          line?: number;
          side?: string;
          severity?: string;
          body?: string;
        }>;
        summary?: string;
      };

      const comments: ParsedReviewComment[] = (parsed.comments ?? [])
        .filter(
          (c): c is { path: string; line: number; severity: string; body: string; side?: string } =>
            typeof c.path === 'string' &&
            typeof c.line === 'number' &&
            typeof c.severity === 'string' &&
            typeof c.body === 'string',
        )
        .map((c) => ({
          path: c.path,
          line: c.line,
          side: (c.side === 'LEFT' ? 'LEFT' : 'RIGHT') as 'LEFT' | 'RIGHT',
          severity: (Object.values(Severity).includes(c.severity as Severity)
            ? c.severity
            : Severity.INFO) as Severity,
          body: c.body,
        }));

      return {
        comments,
        summary: parsed.summary ?? 'No summary provided.',
      };
    } catch (error) {
      throw new MalformedLlmResponseError(
        error instanceof Error ? error.message : 'Unknown parse error',
      );
    }
  }

  private buildSummary(
    diff: { totalRawLines: number; totalSemanticLines: number; noiseReductionPct: number },
    parsed: ParsedReview,
    hasGuidelines: boolean,
  ): string {
    const criticals = parsed.comments.filter((c) => c.severity === Severity.CRITICAL).length;
    const warnings = parsed.comments.filter((c) => c.severity === Severity.WARNING).length;
    const infos = parsed.comments.filter((c) => c.severity === Severity.INFO).length;

    const lines = [
      '## ClearPR Review',
      '',
      `**Diff stats:** ${diff.totalRawLines.toLocaleString()} raw lines → ${diff.totalSemanticLines.toLocaleString()} semantic lines (${diff.noiseReductionPct}% noise filtered)`,
      '',
    ];

    if (parsed.comments.length > 0) {
      lines.push('### Findings');
      if (criticals > 0) lines.push(`- ${criticals} critical`);
      if (warnings > 0) lines.push(`- ${warnings} warning${warnings > 1 ? 's' : ''}`);
      if (infos > 0) lines.push(`- ${infos} info`);
      lines.push('');
    } else {
      lines.push('No issues found.');
      lines.push('');
    }

    if (hasGuidelines) {
      lines.push('> Reviewed against project guidelines.');
    }

    return lines.join('\n');
  }
}
