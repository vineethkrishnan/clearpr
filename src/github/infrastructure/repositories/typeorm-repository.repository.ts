import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { RepositoryRepositoryPort } from '../../domain/ports/repository-repository.port.js';
import { Repository } from '../../domain/entities/repository.entity.js';
import { RepositoryRecord } from './repository.record.js';
import { RepositoryMapper } from './repository.mapper.js';

@Injectable()
export class TypeOrmRepositoryRepository extends RepositoryRepositoryPort {
  constructor(
    @InjectRepository(RepositoryRecord)
    private readonly repo: TypeOrmRepo<RepositoryRecord>,
  ) {
    super();
  }

  async save(repository: Repository): Promise<Repository> {
    await this.repo.save(RepositoryMapper.toRecord(repository));
    return repository;
  }

  async findById(id: string): Promise<Repository | null> {
    const record = await this.repo.findOneBy({ id });
    return record ? RepositoryMapper.toDomain(record) : null;
  }

  async findByGithubId(githubRepoId: number): Promise<Repository | null> {
    const record = await this.repo.findOneBy({ github_repo_id: githubRepoId });
    return record ? RepositoryMapper.toDomain(record) : null;
  }

  async findByInstallationId(installationId: string): Promise<Repository[]> {
    const records = await this.repo.findBy({ installation_id: installationId });
    return records.map((record) => RepositoryMapper.toDomain(record));
  }

  async deleteByInstallationId(installationId: string): Promise<number> {
    const result = await this.repo.delete({ installation_id: installationId });
    return result.affected ?? 0;
  }

  async deleteByGithubId(githubRepoId: number): Promise<Repository | null> {
    const record = await this.repo.findOneBy({ github_repo_id: githubRepoId });
    if (!record) return null;
    await this.repo.delete({ github_repo_id: githubRepoId });
    return RepositoryMapper.toDomain(record);
  }
}
