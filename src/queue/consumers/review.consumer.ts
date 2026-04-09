import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReviewOrchestratorService } from '../../review/application/services/review-orchestrator.service.js';
import { QUEUE_NAMES, type ReviewJobPayload } from '../types/job-payload.types.js';
import type { ReviewContext } from '../../review/domain/types/review-context.types.js';
import { DomainError } from '../../shared/domain/errors/domain-error.base.js';

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

    this.logger.log(
      { correlationId: payload.correlationId, prNumber: payload.prNumber, jobId: job.id },
      'Processing review job',
    );

    try {
      const result = await this.orchestrator.execute(context, payload.trigger);

      if (result.isErr()) {
        const error = result.error;
        if (error instanceof DomainError && error.isTransient) {
          // Let BullMQ retry
          throw error;
        }
        // Permanent error — already handled by orchestrator (status updated, comment posted)
        this.logger.warn(
          { correlationId: payload.correlationId, error: error.code },
          `Review completed with error: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        {
          correlationId: payload.correlationId,
          jobId: job.id,
          attempt: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          error: error instanceof Error ? error.message : 'Unknown',
        },
        'Review job failed — BullMQ will retry if attempts remain',
      );
      throw error; // Re-throw for BullMQ retry
    }
  }
}
