/* eslint-disable @typescript-eslint/unbound-method */
import { InstallationCleanupService } from './installation-cleanup.service.js';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { MemoryRepositoryPort } from '../../../memory/domain/ports/memory-repository.port.js';
import { ReviewRepositoryPort } from '../../domain/ports/review-repository.port.js';
import { Installation } from '../../../github/domain/entities/installation.entity.js';
import { Repository } from '../../../github/domain/entities/repository.entity.js';
import { InstallationStatusValue } from '../../../github/domain/value-objects/installation-status.vo.js';

describe('InstallationCleanupService', () => {
  let service: InstallationCleanupService;
  let installationRepo: jest.Mocked<InstallationRepositoryPort>;
  let repositoryRepo: jest.Mocked<RepositoryRepositoryPort>;
  let reviewRepo: jest.Mocked<ReviewRepositoryPort>;
  let memoryRepo: jest.Mocked<MemoryRepositoryPort>;

  beforeEach(() => {
    installationRepo = {
      save: jest.fn().mockImplementation((inst: Installation) => Promise.resolve(inst)),
      findByGithubId: jest.fn().mockResolvedValue(null),
    };
    repositoryRepo = {
      save: jest.fn(),
      findByGithubId: jest.fn(),
      findByInstallationId: jest.fn().mockResolvedValue([]),
      deleteByInstallationId: jest.fn().mockResolvedValue(0),
      deleteByGithubId: jest.fn().mockResolvedValue(null),
    };
    reviewRepo = {
      save: jest.fn(),
      findByPrAndSha: jest.fn(),
      deleteByRepositoryId: jest.fn().mockResolvedValue(0),
      deleteByRepositoryIds: jest.fn().mockResolvedValue(0),
    };
    memoryRepo = {
      save: jest.fn(),
      saveBatch: jest.fn(),
      findSimilar: jest.fn(),
      deleteByRepositoryId: jest.fn().mockResolvedValue(0),
      deleteByRepositoryIds: jest.fn().mockResolvedValue(0),
    };

    service = new InstallationCleanupService(
      installationRepo,
      repositoryRepo,
      reviewRepo,
      memoryRepo,
    );
  });

  describe('cleanupInstallation', () => {
    it('deletes memory, reviews, and repos, then marks installation inactive', async () => {
      const installation = Installation.create({
        githubInstallationId: 42,
        accountLogin: 'acme',
        accountType: 'Organization',
      });
      const repo1 = Repository.create({
        installationId: installation.id,
        githubRepoId: 101,
        fullName: 'acme/one',
      });
      const repo2 = Repository.create({
        installationId: installation.id,
        githubRepoId: 102,
        fullName: 'acme/two',
      });

      repositoryRepo.findByInstallationId.mockResolvedValue([repo1, repo2]);
      memoryRepo.deleteByRepositoryIds.mockResolvedValue(30);
      reviewRepo.deleteByRepositoryIds.mockResolvedValue(8);
      repositoryRepo.deleteByInstallationId.mockResolvedValue(2);
      installationRepo.findByGithubId.mockResolvedValue(installation);

      const result = await service.cleanupInstallation(installation.id, 42);

      expect(memoryRepo.deleteByRepositoryIds).toHaveBeenCalledWith([repo1.id, repo2.id]);
      expect(reviewRepo.deleteByRepositoryIds).toHaveBeenCalledWith([repo1.id, repo2.id]);
      expect(repositoryRepo.deleteByInstallationId).toHaveBeenCalledWith(installation.id);
      expect(installationRepo.save).toHaveBeenCalledTimes(1);
      const savedInstallation = installationRepo.save.mock.calls[0]?.[0] as Installation;
      expect(savedInstallation.status.value).toBe(InstallationStatusValue.INACTIVE);

      expect(result).toEqual({
        repositoriesDeleted: 2,
        reviewsDeleted: 8,
        memoryEntriesDeleted: 30,
      });
    });

    it('handles an installation with no repositories gracefully', async () => {
      const installation = Installation.create({
        githubInstallationId: 7,
        accountLogin: 'empty',
        accountType: 'User',
      });
      repositoryRepo.findByInstallationId.mockResolvedValue([]);
      installationRepo.findByGithubId.mockResolvedValue(installation);

      const result = await service.cleanupInstallation(installation.id, 7);

      expect(memoryRepo.deleteByRepositoryIds).toHaveBeenCalledWith([]);
      expect(result.repositoriesDeleted).toBe(0);
    });
  });

  describe('cleanupRepository', () => {
    it('returns null when the repository is not tracked', async () => {
      repositoryRepo.deleteByGithubId.mockResolvedValue(null);

      const result = await service.cleanupRepository(999);

      expect(result).toBeNull();
      expect(memoryRepo.deleteByRepositoryId).not.toHaveBeenCalled();
      expect(reviewRepo.deleteByRepositoryId).not.toHaveBeenCalled();
    });

    it('deletes memory and reviews scoped to the removed repository', async () => {
      const repo = Repository.create({
        installationId: 'inst-1',
        githubRepoId: 555,
        fullName: 'acme/removed',
      });
      repositoryRepo.deleteByGithubId.mockResolvedValue(repo);
      memoryRepo.deleteByRepositoryId.mockResolvedValue(17);
      reviewRepo.deleteByRepositoryId.mockResolvedValue(4);

      const result = await service.cleanupRepository(555);

      expect(memoryRepo.deleteByRepositoryId).toHaveBeenCalledWith(repo.id);
      expect(reviewRepo.deleteByRepositoryId).toHaveBeenCalledWith(repo.id);
      expect(result).toEqual({
        repositoriesDeleted: 1,
        reviewsDeleted: 4,
        memoryEntriesDeleted: 17,
      });
    });
  });
});
