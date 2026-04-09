import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckResult,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../shared/infrastructure/redis/redis.module.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      async (): Promise<HealthIndicatorResult> => this.checkRedis(),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      async (): Promise<HealthIndicatorResult> => this.checkRedis(),
    ]);
  }

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const result = await this.redis.ping();
    if (result !== 'PONG') {
      return { redis: { status: 'down' } };
    }
    return { redis: { status: 'up' } };
  }
}
