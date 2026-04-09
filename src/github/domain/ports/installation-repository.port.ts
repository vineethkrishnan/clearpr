import { Installation } from '../entities/installation.entity.js';

export abstract class InstallationRepositoryPort {
  abstract save(installation: Installation): Promise<Installation>;
  abstract findByGithubId(githubInstallationId: number): Promise<Installation | null>;
}
