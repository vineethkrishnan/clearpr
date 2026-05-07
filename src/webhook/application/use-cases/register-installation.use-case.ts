import { Injectable, Logger } from '@nestjs/common';
import { JobProducerService } from '../../../queue/application/use-cases/job-producer.use-case.js';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { Installation } from '../../../github/domain/entities/installation.entity.js';
import { Repository } from '../../../github/domain/entities/repository.entity.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

@Injectable()
export class RegisterInstallationUseCase {
  private readonly logger = new Logger(RegisterInstallationUseCase.name);

  constructor(
    private readonly jobProducer: JobProducerService,
    private readonly installationRepo: InstallationRepositoryPort,
    private readonly repositoryRepo: RepositoryRepositoryPort,
  ) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const account = payload.body['installation'] as
      | {
          id: number;
          account: { login: string; type: string };
        }
      | undefined;
    if (!account) return;

    const installation = Installation.create({
      githubInstallationId: account.id,
      accountLogin: account.account.login,
      accountType: account.account.type as 'Organization' | 'User',
    });
    await this.installationRepo.save(installation);

    // Register initial repositories
    const repos = payload.body['repositories'] as
      | Array<{ id: number; full_name: string }>
      | undefined;
    if (repos) {
      for (const repo of repos) {
        const repository = Repository.create({
          installationId: installation.id,
          githubRepoId: repo.id,
          fullName: repo.full_name,
        });
        await this.repositoryRepo.save(repository);
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
        ghInstallationId: account.id,
        accountLogin: account.account.login,
      },
      `Installation created: ${account.account.login}`,
    );
  }
}
