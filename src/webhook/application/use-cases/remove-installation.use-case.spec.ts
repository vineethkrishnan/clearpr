/* eslint-disable @typescript-eslint/unbound-method */
import { RemoveInstallationUseCase } from './remove-installation.use-case.js';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { CleanupInstallationUseCase } from '../../../review/application/use-cases/cleanup-installation.use-case.js';
import { Installation } from '../../../github/domain/entities/installation.entity.js';

describe('RemoveInstallationUseCase', () => {
  let useCase: RemoveInstallationUseCase;
  let installationRepo: jest.Mocked<InstallationRepositoryPort>;
  let cleanupService: jest.Mocked<CleanupInstallationUseCase>;

  beforeEach(() => {
    installationRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByGithubId: jest.fn(),
    };

    cleanupService = {
      cleanupInstallation: jest.fn().mockResolvedValue({
        repositoriesDeleted: 3,
        reviewsDeleted: 5,
        memoryEntriesDeleted: 12,
      }),
      cleanupRepository: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<CleanupInstallationUseCase>;

    useCase = new RemoveInstallationUseCase(installationRepo, cleanupService);
  });

  it('invokes cleanup service when installation is tracked', async () => {
    const installation = Installation.create({
      githubInstallationId: 999,
      accountLogin: 'acme',
      accountType: 'Organization',
    });
    installationRepo.findByGithubId.mockResolvedValue(installation);

    await useCase.execute({
      event: 'installation',
      action: 'deleted',
      deliveryId: 'd-1',
      installationId: 999,
      body: { installation: { id: 999 } },
    });

    expect(cleanupService.cleanupInstallation).toHaveBeenCalledWith(installation.id, 999);
  });

  it('skips cleanup when installation is not tracked', async () => {
    installationRepo.findByGithubId.mockResolvedValue(null);

    await useCase.execute({
      event: 'installation',
      action: 'deleted',
      deliveryId: 'd-2',
      installationId: 42,
      body: { installation: { id: 42 } },
    });

    expect(cleanupService.cleanupInstallation).not.toHaveBeenCalled();
  });

  it('is a no-op when payload is missing installation block', async () => {
    await useCase.execute({
      event: 'installation',
      action: 'deleted',
      deliveryId: 'd-3',
      installationId: 1,
      body: {},
    });

    expect(installationRepo.findByGithubId).not.toHaveBeenCalled();
    expect(cleanupService.cleanupInstallation).not.toHaveBeenCalled();
  });
});
