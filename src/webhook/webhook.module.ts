import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WebhookController } from './presentation/webhook.controller.js';
import { WebhookDispatcherService } from './application/services/webhook-dispatcher.service.js';
import { HmacSignatureGuard } from './infrastructure/guards/hmac-signature.guard.js';
import { IdempotencyStorePort } from './domain/ports/idempotency-store.port.js';
import { RedisIdempotencyStoreAdapter } from './infrastructure/adapters/redis-idempotency-store.adapter.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'webhook',
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [WebhookController],
  providers: [
    WebhookDispatcherService,
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
