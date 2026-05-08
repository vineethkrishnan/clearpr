/* eslint-disable @typescript-eslint/unbound-method */
import { RegisterRepositoriesUseCase } from './register-repositories.use-case.js';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { Installation } from '../../../github/domain/entities/installation.entity.js';
import { Repository } from '../../../github/domain/entities/repository.entity.js';

describe('RegisterRepositoriesUseCase', () => {
  let useCase: RegisterRepositoriesUseCase;
  let installationRepo: jest.Mocked<InstallationRepositoryPort>;
  let repositoryRepo: jest.Mocked<RepositoryRepositoryPort>;

  beforeEach(() => {
    installationRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByGithubId: jest.fn(),
    };
    repositoryRepo = {
      save: jest.fn().mockImplementation((repo: Repository) => Promise.resolve(repo)),
      findById: jest.fn(),
      findByGithubId: jest.fn(),
      findByInstallationId: jest.fn().mockResolvedValue([]),
      deleteByInstallationId: jest.fn().mockResolvedValue(0),
      deleteByGithubId: jest.fn().mockResolvedValue(null),
    };
    useCase = new RegisterRepositoriesUseCase(installationRepo, repositoryRepo);
  });

  it('creates new repositories that were not previously tracked', async () => {
    const installation = Installation.create({
      githubInstallationId: 999,
      accountLogin: 'acme',
      accountType: 'Organization',
    });
    installationRepo.findByGithubId.mockResolvedValue(installation);
    repositoryRepo.findByGithubId.mockResolvedValue(null);

    await useCase.execute({
      event: 'installation_repositories',
      action: 'added',
      deliveryId: 'd-1',
      installationId: 999,
      body: {
        installation: { id: 999 },
        repositories_added: [
          { id: 100, full_name: 'acme/new-one' },
          { id: 101, full_name: 'acme/new-two' },
        ],
      },
    });

    expect(repositoryRepo.save).toHaveBeenCalledTimes(2);
  });

  it('does not duplicate existing repositories', async () => {
    const installation = Installation.create({
      githubInstallationId: 999,
      accountLogin: 'acme',
      accountType: 'Organization',
    });
    const existing = Repository.create({
      installationId: installation.id,
      githubRepoId: 100,
      fullName: 'acme/existing',
    });
    installationRepo.findByGithubId.mockResolvedValue(installation);
    repositoryRepo.findByGithubId.mockResolvedValue(existing);

    await useCase.execute({
      event: 'installation_repositories',
      action: 'added',
      deliveryId: 'd-2',
      installationId: 999,
      body: {
        installation: { id: 999 },
        repositories_added: [{ id: 100, full_name: 'acme/existing' }],
      },
    });

    expect(repositoryRepo.save).not.toHaveBeenCalled();
  });

  it('skips when installation is not tracked', async () => {
    installationRepo.findByGithubId.mockResolvedValue(null);

    await useCase.execute({
      event: 'installation_repositories',
      action: 'added',
      deliveryId: 'd-3',
      installationId: 999,
      body: {
        installation: { id: 999 },
        repositories_added: [{ id: 100, full_name: 'acme/x' }],
      },
    });

    expect(repositoryRepo.save).not.toHaveBeenCalled();
  });
});
