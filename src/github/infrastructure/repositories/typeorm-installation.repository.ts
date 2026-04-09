import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { InstallationRepositoryPort } from '../../domain/ports/installation-repository.port.js';
import { Installation } from '../../domain/entities/installation.entity.js';
import { InstallationStatusValue } from '../../domain/value-objects/installation-status.vo.js';
import { InstallationSchema, type InstallationRow } from './installation.schema.js';

@Injectable()
export class TypeOrmInstallationRepository extends InstallationRepositoryPort {
  constructor(
    @InjectRepository(InstallationSchema)
    private readonly repo: TypeOrmRepo<InstallationRow>,
  ) {
    super();
  }

  async save(installation: Installation): Promise<Installation> {
    await this.repo.save(this.toRow(installation));
    return installation;
  }

  async findByGithubId(githubInstallationId: number): Promise<Installation | null> {
    const row = await this.repo.findOneBy({
      github_installation_id: githubInstallationId,
    });
    return row ? this.toDomain(row) : null;
  }

  private toRow(entity: Installation): InstallationRow {
    return {
      id: entity.id,
      github_installation_id: entity.githubInstallationId,
      account_login: entity.accountLogin,
      account_type: entity.accountType,
      status: entity.status.value,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  private toDomain(row: InstallationRow): Installation {
    return Installation.reconstitute({
      id: row.id,
      githubInstallationId: Number(row.github_installation_id),
      accountLogin: row.account_login,
      accountType: row.account_type as 'Organization' | 'User',
      status: row.status as InstallationStatusValue,
    });
  }
}
