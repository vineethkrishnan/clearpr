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

    // Stub: MemoryIndexerService will be wired once the GitHub module
    // exposes PR history fetching. Touch the injected service so the
    // hook stays a no-op today without tripping unused-locals, and
    // satisfy the async/Promise signature required by WorkerHost.
    void this.indexer;
    await Promise.resolve();

    this.logger.log(
      { correlationId: payload.correlationId, jobId: job.id },
      'Indexing job completed',
    );
  }
}
