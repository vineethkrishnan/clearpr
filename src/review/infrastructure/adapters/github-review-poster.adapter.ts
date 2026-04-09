import { Injectable } from '@nestjs/common';
import { ReviewPosterPort } from '../../domain/ports/review-poster.port.js';
import { type ReviewComment } from '../../domain/entities/review-comment.entity.js';
import { type ReviewContext } from '../../application/types/review-context.types.js';
import { GitHubClientService } from '../../../github/application/services/github-client.service.js';

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

  async postSummary(context: ReviewContext, summary: string): Promise<void> {
    await this.githubClient.createIssueComment(
      parseInt(context.installationId, 10),
      context.owner,
      context.repo,
      context.prNumber,
      summary,
    );
  }
}
