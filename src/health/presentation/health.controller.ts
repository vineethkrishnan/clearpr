import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckResult,
  type HealthIndicatorFunction,
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
    return this.health.check(this.indicators());
  }

  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check(this.indicators());
  }

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  private indicators(): HealthIndicatorFunction[] {
    return [
      () => this.db.pingCheck('database'),
      async (): Promise<HealthIndicatorResult> => this.checkRedis(),
    ];
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const result = await this.redis.ping();
    const isHealthy = result === 'PONG';
    return { redis: { status: isHealthy ? 'up' : 'down' } };
  }
}
