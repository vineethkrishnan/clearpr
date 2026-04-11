import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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
import { QUEUE_NAMES } from '../../queue/types/job-payload.types.js';

interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
}

const DLQ_FAIL_THRESHOLD = 100;

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    @InjectQueue(QUEUE_NAMES.REVIEWS) private readonly reviewsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COMMANDS) private readonly commandsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.INDEXING) private readonly indexingQueue: Queue,
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
    const checks: HealthIndicatorFunction[] = [() => this.db.pingCheck('database')];
    if (this.redis) {
      checks.push(async (): Promise<HealthIndicatorResult> => this.checkRedis());
    }
    checks.push(async (): Promise<HealthIndicatorResult> => this.checkQueues());
    return checks;
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    if (!this.redis) return { redis: { status: 'down' } };
    const result = await this.redis.ping();
    const isHealthy = result === 'PONG';
    return { redis: { status: isHealthy ? 'up' : 'down' } };
  }

  private async checkQueues(): Promise<HealthIndicatorResult> {
    const [reviews, commands, indexing] = await Promise.all([
      this.getQueueStats(this.reviewsQueue),
      this.getQueueStats(this.commandsQueue),
      this.getQueueStats(this.indexingQueue),
    ]);

    const totalFailed = reviews.failed + commands.failed + indexing.failed;
    const isHealthy = totalFailed < DLQ_FAIL_THRESHOLD;

    return {
      queues: {
        status: isHealthy ? 'up' : 'down',
        reviews,
        commands,
        indexing,
        dlqThreshold: DLQ_FAIL_THRESHOLD,
      },
    };
  }

  private async getQueueStats(queue: Queue): Promise<QueueStats> {
    const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'failed');
    return {
      waiting: counts['waiting'] ?? 0,
      active: counts['active'] ?? 0,
      delayed: counts['delayed'] ?? 0,
      failed: counts['failed'] ?? 0,
    };
  }
}
