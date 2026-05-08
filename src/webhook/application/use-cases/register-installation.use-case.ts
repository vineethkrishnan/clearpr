import { Injectable, Logger } from '@nestjs/common';
import { EnqueueJobUseCase } from '../../../queue/application/use-cases/enqueue-job.use-case.js';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { Installation } from '../../../github/domain/entities/installation.entity.js';
import { Repository } from '../../../github/domain/entities/repository.entity.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

@Injectable()
export class RegisterInstallationUseCase {
  private readonly logger = new Logger(RegisterInstallationUseCase.name);

  constructor(
    private readonly jobProducer: EnqueueJobUseCase,
    private readonly installationRepo: InstallationRepositoryPort,
    private readonly repositoryRepo: RepositoryRepositoryPort,
  ) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const installationBlock = payload.body.installation;
    if (!installationBlock?.account) return;

    const installation = Installation.create({
      githubInstallationId: installationBlock.id,
      accountLogin: installationBlock.account.login,
      accountType: installationBlock.account.type as 'Organization' | 'User',
    });
    await this.installationRepo.save(installation);

    // Register initial repositories
    const initialRepositories = payload.body.repositories;
    if (initialRepositories) {
      for (const repository of initialRepositories) {
        const repositoryEntity = Repository.create({
          installationId: installation.id,
          githubRepoId: repository.id,
          fullName: repository.full_name,
        });
        await this.repositoryRepo.save(repositoryEntity);
      }
    }

    // Queue bulk indexing for the new installation
    await this.jobProducer.enqueueIndexing({
      correlationId: payload.deliveryId,
      installationId: installation.id,
      repositoryId: '',
      repoFullName: '',
      type: 'bulk',
    });

    this.logger.log(
      {
        audit: true,
        event: 'installation_created',
        ghInstallationId: installationBlock.id,
        accountLogin: installationBlock.account.login,
      },
      `Installation created: ${installationBlock.account.login}`,
    );
  }
}
