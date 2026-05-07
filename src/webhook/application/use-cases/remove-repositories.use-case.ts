import { Injectable, Logger } from '@nestjs/common';
import { InstallationCleanupPort } from '../ports/installation-cleanup.port.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

@Injectable()
export class RemoveRepositoriesUseCase {
  private readonly logger = new Logger(RemoveRepositoriesUseCase.name);

  constructor(private readonly cleanupService: InstallationCleanupPort) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const repositoriesRemoved = payload.body.repositories_removed;
    if (!repositoriesRemoved || repositoriesRemoved.length === 0) return;

    for (const repository of repositoriesRemoved) {
      const result = await this.cleanupService.cleanupRepository(repository.id);
      this.logger.log(
        {
          audit: true,
          event: 'repository_removed',
          githubRepoId: repository.id,
          fullName: repository.full_name,
          ...(result ?? { skipped: true }),
        },
        `Repository removed: ${repository.full_name}`,
      );
    }
  }
}
