import { Injectable } from '@nestjs/common';
import {
  CheckRunPosterPort,
  type CheckRunConclusion,
} from '../../domain/ports/check-run-poster.port.js';
import type { ReviewContext } from '../../domain/types/review-context.types.js';
import { GitHubClientService } from '../../../github/infrastructure/adapters/github-client.service.js';

const CHECK_RUN_NAME = 'ClearPR review';

@Injectable()
export class GitHubCheckRunPosterAdapter extends CheckRunPosterPort {
  constructor(private readonly githubClient: GitHubClientService) {
    super();
  }

  async createInProgress(context: ReviewContext): Promise<number> {
    return this.githubClient.createCheckRun(
      parseInt(context.installationId, 10),
      context.owner,
      context.repo,
      context.prSha,
      CHECK_RUN_NAME,
    );
  }

  async complete(
    context: ReviewContext,
    checkRunId: number,
    conclusion: CheckRunConclusion,
    output: { title: string; summary: string },
  ): Promise<void> {
    await this.githubClient.completeCheckRun(
      parseInt(context.installationId, 10),
      context.owner,
      context.repo,
      checkRunId,
      conclusion,
      output,
    );
  }
}
