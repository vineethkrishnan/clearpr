import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, type CommandJobPayload } from '../types/job-payload.types.js';

@Processor(QUEUE_NAMES.COMMANDS, { concurrency: 5 })
export class CommandConsumer extends WorkerHost {
  private readonly logger = new Logger(CommandConsumer.name);

  async process(job: Job<CommandJobPayload>): Promise<void> {
    const payload = job.data;

    this.logger.log(
      {
        correlationId: payload.correlationId,
        command: payload.command,
        prNumber: payload.prNumber,
        jobId: job.id,
      },
      `Processing @clearpr ${payload.command} command`,
    );

    // Command routing will be implemented in M5
    switch (payload.command) {
      case 'review':
        // Re-queue as review job
        break;
      case 'diff':
        // Compute and post semantic diff
        break;
      case 'ignore':
        // Add file pattern to ignore list
        break;
      case 'config':
        // Post active config as comment
        break;
    }

    this.logger.log({ jobId: job.id }, 'Command job completed');
  }
}
