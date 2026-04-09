import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReviewOrchestratorService } from '../../review/application/services/review-orchestrator.service.js';
import { ReviewTrigger } from '../../review/domain/value-objects/review-trigger.vo.js';
import { QUEUE_NAMES, type ReviewJobPayload } from '../types/job-payload.types.js';
import type { ReviewContext } from '../../review/application/types/review-context.types.js';

@Processor(QUEUE_NAMES.REVIEWS, { concurrency: 3 })
export class ReviewConsumer extends WorkerHost {
  private readonly logger = new Logger(ReviewConsumer.name);

  constructor(private readonly orchestrator: ReviewOrchestratorService) {
    super();
  }

  async process(job: Job<ReviewJobPayload>): Promise<void> {
    const payload = job.data;
    const [owner, repo] = payload.repoFullName.split('/');

    if (!owner || !repo) {
      this.logger.error({ jobId: job.id }, 'Invalid repoFullName format');
      return;
    }

    const context: ReviewContext = {
      repositoryId: payload.repositoryId,
      installationId: payload.installationId,
      owner,
      repo,
      prNumber: payload.prNumber,
      prSha: payload.prSha,
      baseBranch: payload.baseBranch,
    };

    const trigger = payload.trigger === 'manual' ? ReviewTrigger.MANUAL : ReviewTrigger.AUTO;

    this.logger.log(
      { correlationId: payload.correlationId, prNumber: payload.prNumber, jobId: job.id },
      `Processing review job`,
    );

    const result = await this.orchestrator.execute(context, trigger);

    if (result.isErr()) {
      this.logger.warn(
        { correlationId: payload.correlationId, error: result.error.code },
        `Review completed with error: ${result.error.message}`,
      );
    }
  }
}
