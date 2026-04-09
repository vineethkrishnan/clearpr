import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfig } from '../config/app.config.js';
import { QUEUE_NAMES } from './types/job-payload.types.js';
import { JobProducerService } from './producers/job-producer.service.js';
import { ReviewConsumer } from './consumers/review.consumer.js';
import { IndexingConsumer } from './consumers/indexing.consumer.js';
import { CommandConsumer } from './consumers/command.consumer.js';
import { ReviewModule } from '../review/review.module.js';
import { MemoryModule } from '../memory/memory.module.js';

@Module({
  imports: [
    forwardRef(() => ReviewModule),
    forwardRef(() => MemoryModule),
    BullModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        connection: {
          url: config.REDIS_URL,
          password: config.REDIS_PASSWORD,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.REVIEWS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
          removeOnComplete: 100,
          removeOnFail: false,
        },
      },
      {
        name: QUEUE_NAMES.COMMANDS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 100,
          removeOnFail: false,
        },
      },
      {
        name: QUEUE_NAMES.INDEXING,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
          removeOnComplete: 50,
          removeOnFail: false,
        },
      },
    ),
  ],
  providers: [JobProducerService, ReviewConsumer, IndexingConsumer, CommandConsumer],
  exports: [JobProducerService],
})
export class QueueModule {}
