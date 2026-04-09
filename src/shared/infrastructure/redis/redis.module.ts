import { Global, Module, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig, NodeEnv } from '../../../config/app.config.js';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfig],
      useFactory: (config: AppConfig): Redis => {
        const redis = new Redis(config.REDIS_URL, {
          password: config.REDIS_PASSWORD,
          tls:
            config.NODE_ENV === NodeEnv.PRODUCTION
              ? { rejectUnauthorized: true }
              : undefined,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => Math.min(times * 200, 5000),
          lazyConnect: true,
        });
        return redis;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
