import { Injectable, Logger } from '@nestjs/common';
import { ReviewPosterPort } from '../../domain/ports/review-poster.port.js';
import { type ReviewComment } from '../../domain/entities/review-comment.entity.js';
import { type ReviewContext } from '../../domain/types/review-context.types.js';
import { GitHubClientService } from '../../../github/infrastructure/adapters/github-client.service.js';
import { GitHubApiError } from '../../../github/domain/errors/github.errors.js';

@Injectable()
export class GitHubReviewPosterAdapter extends ReviewPosterPort {
  private readonly logger = new Logger(GitHubReviewPosterAdapter.name);

  constructor(private readonly githubClient: GitHubClientService) {
    super();
  }

  async postInlineComments(context: ReviewContext, comments: ReviewComment[]): Promise<boolean> {
    if (comments.length === 0) return true;

    try {
      await this.githubClient.createPullRequestReview(
        parseInt(context.installationId, 10),
        context.owner,
        context.repo,
        context.prNumber,
        '',
        comments.map((c) => ({
          path: c.filePath,
          line: c.line,
          body: `**[${c.severity}]** ${c.body}`,
          side: c.side,
        })),
      );
      return true;
    } catch (error) {
      // GitHub rejects the whole review (422) when a comment line is not part
      // of the PR diff - common for unsupported languages where the semantic
      // diff falls back to whitespace filtering and line numbers do not map.
      // Degrade instead of failing the review: the caller lists the findings
      // in the summary.
      if (error instanceof GitHubApiError && error.statusCode === 422) {
        this.logger.warn(
          { prNumber: context.prNumber, reason: error.message },
          'Inline comments could not be anchored to the diff; falling back to summary findings',
        );
        return false;
      }
      throw error;
    }
  }

  async postSummary(context: ReviewContext, summary: string): Promise<number> {
    return this.githubClient.createIssueComment(
      parseInt(context.installationId, 10),
      context.owner,
      context.repo,
      context.prNumber,
      summary,
    );
  }

  async updateSummary(context: ReviewContext, commentId: number, summary: string): Promise<void> {
    await this.githubClient.updateIssueComment(
      parseInt(context.installationId, 10),
      context.owner,
      context.repo,
      commentId,
      summary,
    );
  }

  async postProgressPlaceholder(context: ReviewContext): Promise<number> {
    const body = [
      ':hourglass_flowing_sand: **ClearPR** is reviewing this PR...',
      '',
      'This comment will be replaced with the review summary when the run completes.',
    ].join('\n');
    return this.githubClient.createIssueComment(
      parseInt(context.installationId, 10),
      context.owner,
      context.repo,
      context.prNumber,
      body,
    );
  }
}
