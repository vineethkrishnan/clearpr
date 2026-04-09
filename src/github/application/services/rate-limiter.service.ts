import { Injectable, Logger } from '@nestjs/common';
import { GitHubRateLimitError } from '../../domain/errors/github.errors.js';

interface RateLimitState {
  remaining: number;
  resetAt: Date;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private state: RateLimitState = { remaining: 5000, resetAt: new Date() };

  update(remaining: number, resetTimestamp: number): void {
    this.state = {
      remaining,
      resetAt: new Date(resetTimestamp * 1000),
    };

    if (remaining < 100) {
      this.logger.warn(
        {
          audit: true,
          event: 'rate_limit_warning',
          remaining,
          resetAt: this.state.resetAt.toISOString(),
        },
        `GitHub API rate limit low: ${remaining} remaining`,
      );
    }
  }

  checkBeforeRequest(): void {
    if (this.state.remaining < 10 && this.state.resetAt > new Date()) {
      throw new GitHubRateLimitError(this.state.resetAt);
    }
  }

  get remaining(): number {
    return this.state.remaining;
  }

  get resetAt(): Date {
    return this.state.resetAt;
  }
}
