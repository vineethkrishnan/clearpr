import { Injectable } from '@nestjs/common';
import { JobEnqueuerPort } from '../ports/job-enqueuer.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { parseClearPrCommand } from '../dtos/clearpr-command.dto.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

@Injectable()
export class EnqueueCommandUseCase {
  constructor(
    private readonly jobEnqueuer: JobEnqueuerPort,
    private readonly repositoryRepo: RepositoryRepositoryPort,
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
