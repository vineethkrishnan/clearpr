import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './presentation/health.controller.js';
import { QUEUE_NAMES } from '../queue/types/job-payload.types.js';

@Module({
  imports: [
    TerminusModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.REVIEWS },
      { name: QUEUE_NAMES.COMMANDS },
      { name: QUEUE_NAMES.INDEXING },
    ),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
