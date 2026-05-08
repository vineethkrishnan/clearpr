import { Installation } from '../../domain/entities/installation.entity.js';
import { InstallationStatusValue } from '../../domain/value-objects/installation-status.vo.js';
import { InstallationRecord } from './installation.record.js';

export class InstallationMapper {
  static toDomain(record: InstallationRecord): Installation {
    return Installation.reconstitute({
      id: record.id,
      githubInstallationId: Number(record.github_installation_id),
      accountLogin: record.account_login,
      accountType: record.account_type as 'Organization' | 'User',
      status: record.status as InstallationStatusValue,
    });
  }

  static toRecord(entity: Installation): InstallationRecord {
    const record = new InstallationRecord();
    record.id = entity.id;
    record.github_installation_id = entity.githubInstallationId;
    record.account_login = entity.accountLogin;
    record.account_type = entity.accountType;
    record.status = entity.status.value;
    record.created_at = entity.createdAt;
    record.updated_at = entity.updatedAt;
    return record;
  }
}
