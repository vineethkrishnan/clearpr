import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { InstallationRepositoryPort } from '../../domain/ports/installation-repository.port.js';
import { Installation } from '../../domain/entities/installation.entity.js';
import { InstallationRecord } from './installation.record.js';
import { InstallationMapper } from './installation.mapper.js';

@Injectable()
export class TypeOrmInstallationRepository extends InstallationRepositoryPort {
  constructor(
    @InjectRepository(InstallationRecord)
    private readonly repo: TypeOrmRepo<InstallationRecord>,
  ) {
    super();
  }

  async save(installation: Installation): Promise<Installation> {
    await this.repo.save(InstallationMapper.toRecord(installation));
    return installation;
  }

  async findById(id: string): Promise<Installation | null> {
    const record = await this.repo.findOneBy({ id });
    return record ? InstallationMapper.toDomain(record) : null;
  }

  async findByGithubId(githubInstallationId: number): Promise<Installation | null> {
    const record = await this.repo.findOneBy({
      github_installation_id: githubInstallationId,
    });
    return record ? InstallationMapper.toDomain(record) : null;
  }
}
