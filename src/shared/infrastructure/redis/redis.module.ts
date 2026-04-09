import { Global, Inject, Module, type OnModuleDestroy, type OnModuleInit, Logger } from '@nestjs/common';
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
        return new Redis(config.REDIS_URL, {
          password: config.REDIS_PASSWORD,
          tls:
            config.NODE_ENV === NodeEnv.PRODUCTION
              ? { rejectUnauthorized: true }
              : undefined,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => Math.min(times * 200, 5000),
          lazyConnect: true,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
      this.logger.log('Redis connected');
    } catch (error) {
      this.logger.error('Redis connection failed — will retry on first use', error instanceof Error ? error.message : '');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
    this.logger.log('Redis disconnected');
  }
}
