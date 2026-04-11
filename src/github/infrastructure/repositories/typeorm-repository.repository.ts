import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { RepositoryRepositoryPort } from '../../domain/ports/repository-repository.port.js';
import { Repository, IndexingStatus } from '../../domain/entities/repository.entity.js';
import { RepositorySchema, type RepositoryRow } from './repository.schema.js';

@Injectable()
export class TypeOrmRepositoryRepository extends RepositoryRepositoryPort {
  constructor(
    @InjectRepository(RepositorySchema)
    private readonly repo: TypeOrmRepo<RepositoryRow>,
  ) {
    super();
  }

  async save(repository: Repository): Promise<Repository> {
    await this.repo.save(this.toRow(repository));
    return repository;
  }

  async findByGithubId(githubRepoId: number): Promise<Repository | null> {
    const row = await this.repo.findOneBy({ github_repo_id: githubRepoId });
    return row ? this.toDomain(row) : null;
  }

  async findByInstallationId(installationId: string): Promise<Repository[]> {
    const rows = await this.repo.findBy({ installation_id: installationId });
    return rows.map((row) => this.toDomain(row));
  }

  async deleteByInstallationId(installationId: string): Promise<number> {
    const result = await this.repo.delete({ installation_id: installationId });
    return result.affected ?? 0;
  }

  async deleteByGithubId(githubRepoId: number): Promise<Repository | null> {
    const row = await this.repo.findOneBy({ github_repo_id: githubRepoId });
    if (!row) return null;
    await this.repo.delete({ github_repo_id: githubRepoId });
    return this.toDomain(row);
  }

  private toRow(entity: Repository): RepositoryRow {
    return {
      id: entity.id,
      installation_id: entity.installationId,
      github_repo_id: entity.githubRepoId,
      full_name: entity.fullName,
      settings: entity.settings,
      indexing_status: entity.indexingStatus,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  private toDomain(row: RepositoryRow): Repository {
    return Repository.reconstitute({
      id: row.id,
      installationId: row.installation_id,
      githubRepoId: Number(row.github_repo_id),
      fullName: row.full_name,
      settings: row.settings,
      indexingStatus: row.indexing_status as IndexingStatus,
    });
  }
}
