import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MemoryIndexerService } from '../../memory/application/services/memory-indexer.service.js';
import { QUEUE_NAMES, type IndexingJobPayload } from '../types/job-payload.types.js';

@Processor(QUEUE_NAMES.INDEXING, { concurrency: 2 })
export class IndexingConsumer extends WorkerHost {
  private readonly logger = new Logger(IndexingConsumer.name);

  constructor(private readonly indexer: MemoryIndexerService) {
    super();
  }

  async process(job: Job<IndexingJobPayload>): Promise<void> {
    const payload = job.data;

    this.logger.log(
      {
        correlationId: payload.correlationId,
        type: payload.type,
        repositoryId: payload.repositoryId,
        jobId: job.id,
      },
      `Processing ${payload.type} indexing job`,
    );

    // Actual PR history fetching and comment extraction will be
    // orchestrated by the MemoryIndexerService when connected to
    // the GitHub module. For now, the consumer is wired and ready.
    this.logger.log(
      { correlationId: payload.correlationId, jobId: job.id },
      'Indexing job completed',
    );
  }
}
