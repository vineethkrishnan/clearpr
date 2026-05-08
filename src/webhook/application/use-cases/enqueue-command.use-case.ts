import { Injectable, Logger } from '@nestjs/common';
import { JobEnqueuerPort } from '../ports/job-enqueuer.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { GitHubClientService } from '../../../github/infrastructure/adapters/github-client.service.js';
import { parseClearPrCommand } from '../dtos/clearpr-command.dto.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

@Injectable()
export class EnqueueCommandUseCase {
  private readonly logger = new Logger(EnqueueCommandUseCase.name);

  constructor(
    private readonly jobEnqueuer: JobEnqueuerPort,
    private readonly repositoryRepo: RepositoryRepositoryPort,
    private readonly githubClient: GitHubClientService,
  ) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const comment = payload.body.comment;
    const issue = payload.body.issue;
    const repository = payload.body.repository;
    if (!comment || !issue || !repository) return;

    const parsed = parseClearPrCommand(comment.body);
    if (!parsed) return;

    const dbRepo = await this.repositoryRepo.findByGithubId(repository.id);
    if (!dbRepo) return;

    const [owner, repoName] = repository.full_name.split('/');
    if (owner && repoName) {
      try {
        await this.githubClient.addIssueCommentReaction(
          payload.installationId,
          owner,
          repoName,
          comment.id,
          'eyes',
        );
      } catch (error) {
        this.logger.warn(
          { commentId: comment.id, error: error instanceof Error ? error.message : 'unknown' },
          'Failed to add eyes reaction; continuing with command enqueue',
        );
      }
    }

    await this.jobEnqueuer.enqueueCommand({
      correlationId: payload.deliveryId,
      installationId: String(payload.installationId),
      repositoryId: dbRepo.id,
      repoFullName: repository.full_name,
      prNumber: issue.number,
      command: parsed.command,
      args: parsed.args,
      commentId: comment.id,
    });
  }
}
