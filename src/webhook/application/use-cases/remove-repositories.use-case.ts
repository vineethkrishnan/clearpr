import { Injectable, Logger } from '@nestjs/common';
import { InstallationCleanupService } from '../../../review/application/use-cases/installation-cleanup.use-case.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

@Injectable()
export class RemoveRepositoriesUseCase {
  private readonly logger = new Logger(RemoveRepositoriesUseCase.name);

  constructor(private readonly cleanupService: InstallationCleanupService) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const repos = payload.body['repositories_removed'] as
      | Array<{ id: number; full_name: string }>
      | undefined;
    if (!repos || repos.length === 0) return;

    for (const repo of repos) {
      const result = await this.cleanupService.cleanupRepository(repo.id);
      this.logger.log(
        {
          audit: true,
          event: 'repository_removed',
          githubRepoId: repo.id,
          fullName: repo.full_name,
          ...(result ?? { skipped: true }),
        },
        `Repository removed: ${repo.full_name}`,
      );
    }
  }
}
