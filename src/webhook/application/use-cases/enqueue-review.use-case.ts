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
    const pr = payload.body['pull_request'] as
      | { number: number; head: { sha: string }; base: { ref: string } }
      | undefined;
    const repo = payload.body['repository'] as { id: number; full_name: string } | undefined;
    if (!pr || !repo) return;

    const dbRepo = await this.repositoryRepo.findByGithubId(repo.id);
    if (!dbRepo) return;

    await this.jobProducer.enqueueReview({
      correlationId: payload.deliveryId,
      installationId: String(payload.installationId),
      repositoryId: dbRepo.id,
      repoFullName: repo.full_name,
      prNumber: pr.number,
      prSha: pr.head.sha,
      trigger: 'auto',
      baseBranch: pr.base.ref,
    });
  }
}
