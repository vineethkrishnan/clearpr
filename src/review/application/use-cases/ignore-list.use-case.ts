import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../shared/infrastructure/redis/redis.module.js';

const TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_PATTERNS_PER_PR = 50;

@Injectable()
export class IgnoreListService {
  private readonly logger = new Logger(IgnoreListService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async addPattern(repositoryId: string, prNumber: number, pattern: string): Promise<void> {
    const key = this.key(repositoryId, prNumber);
    await this.redis.sadd(key, pattern);
    await this.redis.expire(key, TTL_SECONDS);

    // Trim oldest if exceeding cap to prevent unbounded growth
    const size = await this.redis.scard(key);
    if (size > MAX_PATTERNS_PER_PR) {
      const members = await this.redis.smembers(key);
      const overflow = members.slice(0, size - MAX_PATTERNS_PER_PR);
      if (overflow.length > 0) {
        await this.redis.srem(key, ...overflow);
      }
    }

    this.logger.debug(
      { repositoryId, prNumber, pattern },
      `Added ignore pattern for PR #${prNumber}`,
    );
  }

  async getPatterns(repositoryId: string, prNumber: number): Promise<string[]> {
    const key = this.key(repositoryId, prNumber);
    return this.redis.smembers(key);
  }

  async clear(repositoryId: string, prNumber: number): Promise<void> {
    await this.redis.del(this.key(repositoryId, prNumber));
  }

  private key(repositoryId: string, prNumber: number): string {
    return `ignore:${repositoryId}:${prNumber}`;
  }
}
