import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { IdempotencyStorePort } from '../../domain/ports/idempotency-store.port.js';
import { REDIS_CLIENT } from '../../../shared/infrastructure/redis/redis.module.js';

const TTL_SECONDS = 86400; // 24 hours

@Injectable()
export class RedisIdempotencyStoreAdapter extends IdempotencyStorePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async exists(deliveryId: string): Promise<boolean> {
    const result = await this.redis.exists(`delivery:${deliveryId}`);
    return result === 1;
  }

  async mark(deliveryId: string, event: string, action?: string): Promise<void> {
    const value = action ? `${event}.${action}` : event;
    await this.redis.set(`delivery:${deliveryId}`, value, 'EX', TTL_SECONDS);
  }
}
