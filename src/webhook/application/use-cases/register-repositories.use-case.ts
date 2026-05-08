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
    const repos = payload.body['repositories_added'] as
      | Array<{ id: number; full_name: string }>
      | undefined;
    if (!repos) return;

    const ghInstallation = payload.body['installation'] as { id: number } | undefined;
    if (!ghInstallation) return;

    const installation = await this.installationRepo.findByGithubId(ghInstallation.id);
    if (!installation) return;

    for (const repo of repos) {
      const existing = await this.repositoryRepo.findByGithubId(repo.id);
      if (!existing) {
        const repository = Repository.create({
          installationId: installation.id,
          githubRepoId: repo.id,
          fullName: repo.full_name,
        });
        await this.repositoryRepo.save(repository);
      }
    }
  }
}
