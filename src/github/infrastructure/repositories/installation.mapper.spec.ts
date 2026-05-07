import { InstallationMapper } from './installation.mapper.js';
import { InstallationRecord } from './installation.record.js';
import { Installation } from '../../domain/entities/installation.entity.js';
import { InstallationStatusValue } from '../../domain/value-objects/installation-status.vo.js';

describe('InstallationMapper', () => {
  // Build a fully populated record fixture for round-trip checks
  const buildRecord = (): InstallationRecord => {
    const record = new InstallationRecord();
    record.id = '11111111-1111-1111-1111-111111111111';
    record.github_installation_id = 12345;
    record.account_login = 'acme-corp';
    record.account_type = 'Organization';
    record.status = InstallationStatusValue.ACTIVE;
    record.created_at = new Date('2025-01-01T00:00:00.000Z');
    record.updated_at = new Date('2025-01-02T00:00:00.000Z');
    return record;
  };

  it('toDomain reconstitutes domain entity with all fields', () => {
    const record = buildRecord();
    const installation = InstallationMapper.toDomain(record);

    expect(installation.id).toBe(record.id);
    expect(installation.githubInstallationId).toBe(record.github_installation_id);
    expect(installation.accountLogin).toBe(record.account_login);
    expect(installation.accountType).toBe(record.account_type);
    expect(installation.status.value).toBe(record.status);
  });

  it('toRecord serializes domain entity into record shape', () => {
    const installation = Installation.reconstitute({
      id: '22222222-2222-2222-2222-222222222222',
      githubInstallationId: 999,
      accountLogin: 'org',
      accountType: 'User',
      status: InstallationStatusValue.INACTIVE,
    });

    const record = InstallationMapper.toRecord(installation);

    expect(record).toBeInstanceOf(InstallationRecord);
    expect(record.id).toBe(installation.id);
    expect(record.github_installation_id).toBe(installation.githubInstallationId);
    expect(record.account_login).toBe(installation.accountLogin);
    expect(record.account_type).toBe(installation.accountType);
    expect(record.status).toBe(installation.status.value);
    expect(record.created_at).toBe(installation.createdAt);
    expect(record.updated_at).toBe(installation.updatedAt);
  });

  it('round-trips record -> domain -> record without losing fields', () => {
    const original = buildRecord();
    const roundTripped = InstallationMapper.toRecord(InstallationMapper.toDomain(original));

    // Domain layer regenerates created_at / updated_at on reconstitute, so we
    // exclude those timestamps from the equality check (they are Date objects
    // re-derived from BaseEntity.constructor).
    const { created_at: _origCreated, updated_at: _origUpdated, ...originalRest } = original;
    const { created_at: _rtCreated, updated_at: _rtUpdated, ...roundTrippedRest } = roundTripped;

    expect(roundTrippedRest).toEqual(originalRest);
    expect(roundTripped.created_at).toBeInstanceOf(Date);
    expect(roundTripped.updated_at).toBeInstanceOf(Date);
  });
});
