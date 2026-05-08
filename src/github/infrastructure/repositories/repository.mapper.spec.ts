import { RepositoryMapper } from './repository.mapper.js';
import { RepositoryRecord } from './repository.record.js';
import { Repository, IndexingStatus } from '../../domain/entities/repository.entity.js';

describe('RepositoryMapper', () => {
  // Build a fully populated record fixture for round-trip checks
  const buildRecord = (): RepositoryRecord => {
    const record = new RepositoryRecord();
    record.id = '11111111-1111-1111-1111-111111111111';
    record.installation_id = '22222222-2222-2222-2222-222222222222';
    record.github_repo_id = 987654;
    record.full_name = 'acme-corp/widgets';
    record.settings = { autoReview: true, notifyOnFailure: false };
    record.indexing_status = IndexingStatus.COMPLETED;
    record.created_at = new Date('2025-01-01T00:00:00.000Z');
    record.updated_at = new Date('2025-01-02T00:00:00.000Z');
    return record;
  };

  it('toDomain reconstitutes domain entity with all fields', () => {
    const record = buildRecord();
    const repository = RepositoryMapper.toDomain(record);

    expect(repository.id).toBe(record.id);
    expect(repository.installationId).toBe(record.installation_id);
    expect(repository.githubRepoId).toBe(record.github_repo_id);
    expect(repository.fullName).toBe(record.full_name);
    expect(repository.settings).toEqual(record.settings);
    expect(repository.indexingStatus).toBe(record.indexing_status);
  });

  it('toRecord serializes domain entity into record shape', () => {
    const repository = Repository.reconstitute({
      id: '33333333-3333-3333-3333-333333333333',
      installationId: '44444444-4444-4444-4444-444444444444',
      githubRepoId: 12345,
      fullName: 'org/repo',
      settings: { foo: 'bar' },
      indexingStatus: IndexingStatus.IN_PROGRESS,
    });

    const record = RepositoryMapper.toRecord(repository);

    expect(record).toBeInstanceOf(RepositoryRecord);
    expect(record.id).toBe(repository.id);
    expect(record.installation_id).toBe(repository.installationId);
    expect(record.github_repo_id).toBe(repository.githubRepoId);
    expect(record.full_name).toBe(repository.fullName);
    expect(record.settings).toEqual(repository.settings);
    expect(record.indexing_status).toBe(repository.indexingStatus);
    expect(record.created_at).toBe(repository.createdAt);
    expect(record.updated_at).toBe(repository.updatedAt);
  });

  it('round-trips record -> domain -> record without losing fields', () => {
    const original = buildRecord();
    const roundTripped = RepositoryMapper.toRecord(RepositoryMapper.toDomain(original));

    // Domain layer regenerates created_at / updated_at on reconstitute, so we
    // exclude those timestamps from the equality check.
    const { created_at: _origCreated, updated_at: _origUpdated, ...originalRest } = original;
    const { created_at: _rtCreated, updated_at: _rtUpdated, ...roundTrippedRest } = roundTripped;

    expect(roundTrippedRest).toEqual(originalRest);
    expect(roundTripped.created_at).toBeInstanceOf(Date);
    expect(roundTripped.updated_at).toBeInstanceOf(Date);
  });
});
