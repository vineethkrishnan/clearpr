import { Repository, IndexingStatus } from '../../domain/entities/repository.entity.js';
import { RepositoryRecord } from './repository.record.js';

export class RepositoryMapper {
  static toDomain(record: RepositoryRecord): Repository {
    return Repository.reconstitute({
      id: record.id,
      installationId: record.installation_id,
      githubRepoId: Number(record.github_repo_id),
      fullName: record.full_name,
      settings: record.settings,
      indexingStatus: record.indexing_status as IndexingStatus,
    });
  }

  static toRecord(entity: Repository): RepositoryRecord {
    const record = new RepositoryRecord();
    record.id = entity.id;
    record.installation_id = entity.installationId;
    record.github_repo_id = entity.githubRepoId;
    record.full_name = entity.fullName;
    record.settings = entity.settings;
    record.indexing_status = entity.indexingStatus;
    record.created_at = entity.createdAt;
    record.updated_at = entity.updatedAt;
    return record;
  }
}
