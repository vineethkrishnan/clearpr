import { Injectable, Logger } from '@nestjs/common';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { InstallationCleanupPort } from '../ports/installation-cleanup.port.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

@Injectable()
export class RemoveInstallationUseCase {
  private readonly logger = new Logger(RemoveInstallationUseCase.name);

  constructor(
    private readonly installationRepo: InstallationRepositoryPort,
    private readonly cleanupService: InstallationCleanupPort,
  ) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const ghInstallation = payload.body.installation;
    if (!ghInstallation) return;

    const installation = await this.installationRepo.findByGithubId(ghInstallation.id);
    if (!installation) return;

    const result = await this.cleanupService.cleanupInstallation(
      installation.id,
      ghInstallation.id,
    );

    this.logger.log(
      {
        audit: true,
        event: 'installation_deleted',
        ghInstallationId: ghInstallation.id,
        ...result,
      },
      `Installation deleted: ${ghInstallation.id}`,
    );
  }
}
