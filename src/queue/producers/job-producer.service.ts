import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../shared/infrastructure/redis/redis.module.js';
import { AppConfig } from '../../config/app.config.js';
import {
  QUEUE_NAMES,
  type ReviewJobPayload,
  type CommandJobPayload,
  type IndexingJobPayload,
} from '../types/job-payload.types.js';

@Injectable()
export class JobProducerService {
  private readonly logger = new Logger(JobProducerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.REVIEWS) private readonly reviewQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COMMANDS) private readonly commandQueue: Queue,
    @InjectQueue(QUEUE_NAMES.INDEXING) private readonly indexingQueue: Queue,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: AppConfig,
  ) {}

  async enqueueReview(payload: ReviewJobPayload): Promise<void> {
    const debounceKey = `debounce:${payload.repositoryId}:${payload.prNumber}`;
    const existingJobId = await this.redis.get(debounceKey);

    if (existingJobId) {
      const job = await this.reviewQueue.getJob(existingJobId);
      if (job && (await job.isWaiting())) {
        await job.updateData({ ...job.data, prSha: payload.prSha } as ReviewJobPayload);
        this.logger.debug(
          { prNumber: payload.prNumber, jobId: existingJobId },
          'Debounced: updated existing review job with new SHA',
        );
        return;
      }
    }

    const job = await this.reviewQueue.add('review-pr', payload, {
      priority: payload.trigger === 'manual' ? 1 : 10,
    });
    await this.redis.set(debounceKey, job.id ?? '', 'EX', Math.floor(this.config.DEBOUNCE_WINDOW_MS / 1000));

    this.logger.log(
      { prNumber: payload.prNumber, jobId: job.id, trigger: payload.trigger },
      'Review job enqueued',
    );
  }

  async enqueueCommand(payload: CommandJobPayload): Promise<void> {
    const job = await this.commandQueue.add('process-command', payload);
    this.logger.log(
      { prNumber: payload.prNumber, command: payload.command, jobId: job.id },
      'Command job enqueued',
    );
  }

  async enqueueIndexing(payload: IndexingJobPayload): Promise<void> {
    const job = await this.indexingQueue.add(
      payload.type === 'bulk' ? 'index-pr-history' : 'index-merged-pr',
      payload,
    );
    this.logger.log(
      { type: payload.type, jobId: job.id },
      'Indexing job enqueued',
    );
  }
}
