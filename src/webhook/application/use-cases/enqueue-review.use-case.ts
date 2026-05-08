import { Injectable } from '@nestjs/common';
import { JobEnqueuerPort } from '../ports/job-enqueuer.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

@Injectable()
export class EnqueueReviewUseCase {
  constructor(
    private readonly jobEnqueuer: JobEnqueuerPort,
    private readonly repositoryRepo: RepositoryRepositoryPort,
  ) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const pullRequest = payload.body.pull_request;
    const repository = payload.body.repository;
    if (!pullRequest || !repository) return;

    const dbRepo = await this.repositoryRepo.findByGithubId(repository.id);
    if (!dbRepo) return;

    await this.jobEnqueuer.enqueueReview({
      correlationId: payload.deliveryId,
      installationId: String(payload.installationId),
      repositoryId: dbRepo.id,
      repoFullName: repository.full_name,
      prNumber: pullRequest.number,
      prSha: pullRequest.head.sha,
      trigger: 'auto',
      baseBranch: pullRequest.base.ref,
    });
  }
}
