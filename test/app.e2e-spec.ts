import { Test } from '@nestjs/testing';
import { type INestApplication, Module } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import type { Server } from 'http';
import { ConfigModule } from '../src/config/config.module.js';
import { ClsConfigModule } from '../src/shared/infrastructure/cls/cls.module.js';
import { LoggingModule } from '../src/shared/infrastructure/logging/logging.module.js';
import { WebhookController } from '../src/webhook/presentation/webhook.controller.js';
import { WebhookDispatcherService } from '../src/webhook/application/services/webhook-dispatcher.service.js';
import { HmacSignatureGuard } from '../src/webhook/infrastructure/guards/hmac-signature.guard.js';
import { IdempotencyStorePort } from '../src/webhook/domain/ports/idempotency-store.port.js';
import { AppConfig } from '../src/config/app.config.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// In-memory idempotency store for tests
class InMemoryIdempotencyStore extends IdempotencyStorePort {
  private store = new Set<string>();
  async exists(id: string): Promise<boolean> {
    return this.store.has(id);
  }
  async mark(id: string): Promise<void> {
    this.store.add(id);
  }
}

const TEST_SECRET = 'e2e-test-secret';

function signPayload(body: string): string {
  return 'sha256=' + createHmac('sha256', TEST_SECRET).update(body).digest('hex');
}

// Minimal test module — just webhook + health, no DB/Redis/GitHub deps
@Module({
  imports: [
    ConfigModule,
    ClsConfigModule,
    LoggingModule,
    ThrottlerModule.forRoot([{ name: 'webhook', ttl: 60000, limit: 100 }]),
  ],
  controllers: [WebhookController],
  providers: [
    WebhookDispatcherService,
    HmacSignatureGuard,
    {
      provide: IdempotencyStorePort,
      useClass: InMemoryIdempotencyStore,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
class TestModule {}

describe('ClearPR E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /webhook', () => {
    it('should return 401 when signature is missing', async () => {
      await request(app.getHttpServer() as Server)
        .post('/webhook')
        .send(JSON.stringify({ action: 'opened' }))
        .set('Content-Type', 'application/json')
        .set('x-github-event', 'pull_request')
        .set('x-github-delivery', 'e2e-delivery-1')
        .expect(401);
    });

    it('should return 401 when signature is invalid', async () => {
      const body = JSON.stringify({ action: 'opened' });

      await request(app.getHttpServer() as Server)
        .post('/webhook')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-github-event', 'pull_request')
        .set('x-github-delivery', 'e2e-delivery-2')
        .set('x-hub-signature-256', 'sha256=invalid-signature')
        .expect(401);
    });

    it('should return 200 when signature is valid', async () => {
      const body = JSON.stringify({
        action: 'opened',
        installation: { id: 12345 },
      });
      const signature = signPayload(body);

      const res = await request(app.getHttpServer() as Server)
        .post('/webhook')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-github-event', 'pull_request')
        .set('x-github-delivery', 'e2e-delivery-3')
        .set('x-hub-signature-256', signature)
        .expect(200);

      expect(res.body).toEqual({ received: true });
    });

    it('should handle duplicate deliveries gracefully', async () => {
      const body = JSON.stringify({
        action: 'synchronize',
        installation: { id: 12345 },
      });
      const signature = signPayload(body);
      const deliveryId = 'e2e-delivery-dup';

      // First request
      await request(app.getHttpServer() as Server)
        .post('/webhook')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-github-event', 'pull_request')
        .set('x-github-delivery', deliveryId)
        .set('x-hub-signature-256', signature)
        .expect(200);

      // Duplicate — should still return 200
      await request(app.getHttpServer() as Server)
        .post('/webhook')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-github-event', 'pull_request')
        .set('x-github-delivery', deliveryId)
        .set('x-hub-signature-256', signature)
        .expect(200);
    });
  });
});
