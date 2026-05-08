import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { App } from 'octokit';
import { REDIS_CLIENT } from '../../../shared/infrastructure/redis/redis.module.js';
import { AppConfig } from '../../../config/app.config.js';

@Injectable()
export class InstallationTokenService {
  private readonly logger = new Logger(InstallationTokenService.name);
  private readonly app: App;

  constructor(
    private readonly config: AppConfig,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.app = new App({
      appId: this.config.GITHUB_APP_ID,
      privateKey: this.config.GITHUB_PRIVATE_KEY,
    });
  }

  async getToken(installationId: number): Promise<string> {
    const cacheKey = `token:${installationId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return cached;
    }

    const octokit = await this.app.getInstallationOctokit(installationId);
    const { data } = await octokit.rest.apps.createInstallationAccessToken({
      installation_id: installationId,
    });

    const token = data.token;
    const expiresAt = new Date(data.expires_at);
    const ttlSeconds = Math.max(Math.floor((expiresAt.getTime() - Date.now()) / 1000) - 600, 60);

    await this.redis.set(cacheKey, token, 'EX', ttlSeconds);

    this.logger.debug(
      { audit: true, event: 'token_refresh', installationId, expiresAt: expiresAt.toISOString() },
      'Installation token refreshed',
    );

    return token;
  }
}
