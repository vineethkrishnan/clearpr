import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { ClsConfigModule } from './shared/infrastructure/cls/cls.module.js';
import { LoggingModule } from './shared/infrastructure/logging/logging.module.js';
import { DatabaseModule } from './shared/infrastructure/database/database.module.js';
import { RedisModule } from './shared/infrastructure/redis/redis.module.js';
import { GitHubModule } from './github/github.module.js';
import { WebhookModule } from './webhook/webhook.module.js';
import { QueueModule } from './queue/queue.module.js';
import { HealthModule } from './health/health.module.js';
import { DiffEngineModule } from './diff-engine/diff-engine.module.js';
import { ReviewModule } from './review/review.module.js';
import { MemoryModule } from './memory/memory.module.js';

@Module({
  imports: [
    ConfigModule,
    ClsConfigModule,
    LoggingModule,
    DatabaseModule,
    RedisModule,
    GitHubModule,
    WebhookModule,
    QueueModule,
    HealthModule,
    DiffEngineModule,
    ReviewModule,
    MemoryModule,
  ],
})
export class AppModule {}
