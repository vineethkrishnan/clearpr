import { Injectable } from '@nestjs/common';
import { EnqueueJobUseCase } from '../../../queue/application/use-cases/enqueue-job.use-case.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

@Injectable()
export class EnqueueReviewUseCase {
  constructor(
    private readonly jobProducer: EnqueueJobUseCase,
    private readonly repositoryRepo: RepositoryRepositoryPort,
  ) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const pullRequest = payload.body.pull_request;
    const repository = payload.body.repository;
    if (!pullRequest || !repository) return;

    const dbRepo = await this.repositoryRepo.findByGithubId(repository.id);
    if (!dbRepo) return;

    await this.jobProducer.enqueueReview({
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
