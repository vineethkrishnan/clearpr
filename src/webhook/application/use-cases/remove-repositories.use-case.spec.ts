/* eslint-disable @typescript-eslint/unbound-method */
import { RemoveRepositoriesUseCase } from './remove-repositories.use-case.js';
import { InstallationCleanupPort } from '../ports/installation-cleanup.port.js';

describe('RemoveRepositoriesUseCase', () => {
  let useCase: RemoveRepositoriesUseCase;
  let cleanupService: jest.Mocked<InstallationCleanupPort>;

  beforeEach(() => {
    cleanupService = {
      cleanupInstallation: jest.fn(),
      cleanupRepository: jest.fn().mockResolvedValue(null),
    };

    useCase = new RemoveRepositoriesUseCase(cleanupService);
  });

  it('invokes cleanup once per removed repository', async () => {
    cleanupService.cleanupRepository.mockResolvedValue({
      repositoriesDeleted: 1,
      reviewsDeleted: 5,
      memoryEntriesDeleted: 12,
    });

    await useCase.execute({
      event: 'installation_repositories',
      action: 'removed',
      deliveryId: 'd-1',
      installationId: 999,
      body: {
        installation: { id: 999 },
        repositories_removed: [
          { id: 111, full_name: 'acme/retired-a' },
          { id: 222, full_name: 'acme/retired-b' },
        ],
      },
    });

    expect(cleanupService.cleanupRepository).toHaveBeenCalledTimes(2);
    expect(cleanupService.cleanupRepository).toHaveBeenNthCalledWith(1, 111);
    expect(cleanupService.cleanupRepository).toHaveBeenNthCalledWith(2, 222);
  });

  it('is a no-op when repositories_removed is empty', async () => {
    await useCase.execute({
      event: 'installation_repositories',
      action: 'removed',
      deliveryId: 'd-2',
      installationId: 999,
      body: { installation: { id: 999 }, repositories_removed: [] },
    });

    expect(cleanupService.cleanupRepository).not.toHaveBeenCalled();
  });
});
