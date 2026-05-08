import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CommandHandlerPort } from '../application/ports/command-handler.port.js';
import { QUEUE_NAMES, type CommandJobPayload } from '../types/job-payload.types.js';

@Processor(QUEUE_NAMES.COMMANDS, { concurrency: 5 })
export class CommandConsumer extends WorkerHost {
  private readonly logger = new Logger(CommandConsumer.name);

  constructor(private readonly commandHandler: CommandHandlerPort) {
    super();
  }

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

    try {
      await this.commandHandler.handle(payload);
      this.logger.log({ jobId: job.id }, 'Command job completed');
    } catch (error) {
      this.logger.error(
        {
          correlationId: payload.correlationId,
          jobId: job.id,
          attempt: job.attemptsMade,
          error: error instanceof Error ? error.message : 'Unknown',
        },
        'Command job failed — BullMQ will retry if attempts remain',
      );
      throw error;
    }
  }
}
