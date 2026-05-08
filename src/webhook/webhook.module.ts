import { Module, forwardRef } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WebhookController } from './presenters/http/webhook.controller.js';
import { WebhookDispatcherService } from './application/use-cases/webhook-dispatcher.use-case.js';
import { EnqueueReviewUseCase } from './application/use-cases/enqueue-review.use-case.js';
import { EnqueueCommandUseCase } from './application/use-cases/enqueue-command.use-case.js';
import { RegisterInstallationUseCase } from './application/use-cases/register-installation.use-case.js';
import { RemoveInstallationUseCase } from './application/use-cases/remove-installation.use-case.js';
import { RegisterRepositoriesUseCase } from './application/use-cases/register-repositories.use-case.js';
import { RemoveRepositoriesUseCase } from './application/use-cases/remove-repositories.use-case.js';
import { HmacSignatureGuard } from './infrastructure/guards/hmac-signature.guard.js';
import { IdempotencyStorePort } from './domain/ports/idempotency-store.port.js';
import { RedisIdempotencyStoreAdapter } from './infrastructure/adapters/redis-idempotency-store.adapter.js';
import { QueueModule } from '../queue/queue.module.js';
import { GitHubModule } from '../github/github.module.js';
import { ReviewModule } from '../review/review.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'webhook', ttl: 60000, limit: 100 }]),
    forwardRef(() => QueueModule),
    GitHubModule,
    ReviewModule,
  ],
  controllers: [WebhookController],
  providers: [
    WebhookDispatcherService,
    EnqueueReviewUseCase,
    EnqueueCommandUseCase,
    RegisterInstallationUseCase,
    RemoveInstallationUseCase,
    RegisterRepositoriesUseCase,
    RemoveRepositoriesUseCase,
    HmacSignatureGuard,
    {
      provide: IdempotencyStorePort,
      useClass: RedisIdempotencyStoreAdapter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class WebhookModule {}
