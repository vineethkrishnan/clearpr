import { Controller, Get, Inject, Optional } from '@nestjs/common';
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
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
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
    const checks: HealthIndicatorFunction[] = [
      () => this.db.pingCheck('database'),
    ];
    if (this.redis) {
      checks.push(async (): Promise<HealthIndicatorResult> => this.checkRedis());
    }
    return checks;
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    if (!this.redis) return { redis: { status: 'down' } };
    const result = await this.redis.ping();
    const isHealthy = result === 'PONG';
    return { redis: { status: isHealthy ? 'up' : 'down' } };
  }
}
