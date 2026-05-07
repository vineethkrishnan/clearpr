import { Injectable } from '@nestjs/common';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { Repository } from '../../../github/domain/entities/repository.entity.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

@Injectable()
export class RegisterRepositoriesUseCase {
  constructor(
    private readonly installationRepo: InstallationRepositoryPort,
    private readonly repositoryRepo: RepositoryRepositoryPort,
  ) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const repositoriesAdded = payload.body.repositories_added;
    if (!repositoriesAdded) return;

    const ghInstallation = payload.body.installation;
    if (!ghInstallation) return;

    const installation = await this.installationRepo.findByGithubId(ghInstallation.id);
    if (!installation) return;

    for (const repository of repositoriesAdded) {
      const existing = await this.repositoryRepo.findByGithubId(repository.id);
      if (!existing) {
        const repositoryEntity = Repository.create({
          installationId: installation.id,
          githubRepoId: repository.id,
          fullName: repository.full_name,
        });
        await this.repositoryRepo.save(repositoryEntity);
      }
    }
  }
}
