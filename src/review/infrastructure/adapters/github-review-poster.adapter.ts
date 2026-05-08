import { Injectable } from '@nestjs/common';
import { ReviewPosterPort } from '../../domain/ports/review-poster.port.js';
import { type ReviewComment } from '../../domain/entities/review-comment.entity.js';
import { type ReviewContext } from '../../domain/types/review-context.types.js';
import { GitHubClientService } from '../../../github/infrastructure/adapters/github-client.service.js';

@Injectable()
export class GitHubReviewPosterAdapter extends ReviewPosterPort {
  constructor(private readonly githubClient: GitHubClientService) {
    super();
  }

  async postInlineComments(context: ReviewContext, comments: ReviewComment[]): Promise<void> {
    if (comments.length === 0) return;

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
