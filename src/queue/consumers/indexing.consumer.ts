import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RepositoryIndexerPort } from '../application/ports/repository-indexer.port.js';
import { QUEUE_NAMES, type IndexingJobPayload } from '../types/job-payload.types.js';

@Processor(QUEUE_NAMES.INDEXING, { concurrency: 2 })
export class IndexingConsumer extends WorkerHost {
  private readonly logger = new Logger(IndexingConsumer.name);

  constructor(private readonly repositoryIndexer: RepositoryIndexerPort) {
    super();
  }

  async process(job: Job<IndexingJobPayload>): Promise<void> {
    const payload = job.data;

    this.logger.log(
      {
        correlationId: payload.correlationId,
        type: payload.type,
        repositoryId: payload.repositoryId || undefined,
        installationId: payload.installationId,
        jobId: job.id,
      },
      `Processing ${payload.type} indexing job`,
    );

    if (payload.type === 'bulk') {
      const result = await this.repositoryIndexer.indexInstallation(payload.installationId);
      this.logger.log(
        { correlationId: payload.correlationId, jobId: job.id, ...result },
        `Bulk indexing completed: ${result.reposIndexed} repos indexed`,
      );
      return;
    }

    if (!payload.repositoryId) {
      this.logger.warn(
        { correlationId: payload.correlationId, jobId: job.id },
        'Incremental indexing job missing repositoryId - skipping',
      );
      return;
    }

    const result = await this.repositoryIndexer.indexRepositoryById(payload.repositoryId);
    if (!result) {
      this.logger.warn(
        { correlationId: payload.correlationId, repositoryId: payload.repositoryId },
        'Incremental indexing target repository not found - skipping',
      );
      return;
    }

    this.logger.log(
      { correlationId: payload.correlationId, jobId: job.id, ...result },
      `Incremental indexing completed: ${result.commentsIndexed} comments`,
    );
  }
}
