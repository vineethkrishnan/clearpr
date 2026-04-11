import { Repository } from '../entities/repository.entity.js';

export abstract class RepositoryRepositoryPort {
  abstract save(repo: Repository): Promise<Repository>;
  abstract findByGithubId(githubRepoId: number): Promise<Repository | null>;
  abstract findByInstallationId(installationId: string): Promise<Repository[]>;
  abstract deleteByInstallationId(installationId: string): Promise<number>;
  abstract deleteByGithubId(githubRepoId: number): Promise<Repository | null>;
}
