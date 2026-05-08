/* eslint-disable @typescript-eslint/unbound-method */
import { RegisterInstallationUseCase } from './register-installation.use-case.js';
import { JobEnqueuerPort } from '../ports/job-enqueuer.port.js';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { Installation } from '../../../github/domain/entities/installation.entity.js';
import { Repository } from '../../../github/domain/entities/repository.entity.js';

describe('RegisterInstallationUseCase', () => {
  let useCase: RegisterInstallationUseCase;
  let jobEnqueuer: jest.Mocked<JobEnqueuerPort>;
  let installationRepo: jest.Mocked<InstallationRepositoryPort>;
  let repositoryRepo: jest.Mocked<RepositoryRepositoryPort>;

  beforeEach(() => {
    jobEnqueuer = {
      enqueueReview: jest.fn().mockResolvedValue(undefined),
      enqueueCommand: jest.fn().mockResolvedValue(undefined),
      enqueueIndexing: jest.fn().mockResolvedValue(undefined),
    };

    installationRepo = {
      save: jest.fn().mockImplementation((inst: Installation) => Promise.resolve(inst)),
      findById: jest.fn().mockResolvedValue(null),
      findByGithubId: jest.fn().mockResolvedValue(null),
    };

    repositoryRepo = {
      save: jest.fn().mockImplementation((repo: Repository) => Promise.resolve(repo)),
      findById: jest.fn(),
      findByGithubId: jest.fn(),
      findByInstallationId: jest.fn().mockResolvedValue([]),
      deleteByInstallationId: jest.fn().mockResolvedValue(0),
      deleteByGithubId: jest.fn().mockResolvedValue(null),
    };

    useCase = new RegisterInstallationUseCase(jobEnqueuer, installationRepo, repositoryRepo);
  });

  it('persists installation, registers initial repos, and enqueues bulk indexing', async () => {
    await useCase.execute({
      event: 'installation',
      action: 'created',
      deliveryId: 'd-1',
      installationId: 555,
      body: {
        installation: { id: 555, account: { login: 'acme', type: 'Organization' } },
        repositories: [
          { id: 1, full_name: 'acme/one' },
          { id: 2, full_name: 'acme/two' },
        ],
      },
    });

    expect(installationRepo.save).toHaveBeenCalledTimes(1);
    expect(repositoryRepo.save).toHaveBeenCalledTimes(2);
    expect(jobEnqueuer.enqueueIndexing).toHaveBeenCalledTimes(1);
    expect(jobEnqueuer.enqueueIndexing).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'bulk' }),
    );
  });

  it('is a no-op when installation is missing from body', async () => {
    await useCase.execute({
      event: 'installation',
      action: 'created',
      deliveryId: 'd-2',
      installationId: 555,
      body: {},
    });

    expect(installationRepo.save).not.toHaveBeenCalled();
    expect(jobEnqueuer.enqueueIndexing).not.toHaveBeenCalled();
  });
});
