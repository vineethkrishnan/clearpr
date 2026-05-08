/* eslint-disable @typescript-eslint/unbound-method */
import { EnqueueCommandUseCase } from './enqueue-command.use-case.js';
import { JobEnqueuerPort } from '../ports/job-enqueuer.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { Repository } from '../../../github/domain/entities/repository.entity.js';

describe('EnqueueCommandUseCase', () => {
  let useCase: EnqueueCommandUseCase;
  let jobEnqueuer: jest.Mocked<JobEnqueuerPort>;
  let repositoryRepo: jest.Mocked<RepositoryRepositoryPort>;

  beforeEach(() => {
    jobEnqueuer = {
      enqueueReview: jest.fn().mockResolvedValue(undefined),
      enqueueCommand: jest.fn().mockResolvedValue(undefined),
      enqueueIndexing: jest.fn().mockResolvedValue(undefined),
    };

    repositoryRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByGithubId: jest.fn(),
      findByInstallationId: jest.fn().mockResolvedValue([]),
      deleteByInstallationId: jest.fn().mockResolvedValue(0),
      deleteByGithubId: jest.fn().mockResolvedValue(null),
    };

    const dbRepo = Repository.create({
      installationId: 'inst-1',
      githubRepoId: 555,
      fullName: 'acme/widgets',
    });
    repositoryRepo.findByGithubId.mockResolvedValue(dbRepo);

    useCase = new EnqueueCommandUseCase(jobEnqueuer, repositoryRepo);
  });

  it('enqueues a command job for "@clearpr review"', async () => {
    await useCase.execute({
      event: 'issue_comment',
      action: 'created',
      deliveryId: 'd-1',
      installationId: 999,
      body: {
        comment: { body: '@clearpr review', id: 7 },
        issue: { number: 12 },
        repository: { id: 555, full_name: 'acme/widgets' },
      },
    });

    expect(jobEnqueuer.enqueueCommand).toHaveBeenCalledTimes(1);
    expect(jobEnqueuer.enqueueCommand).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'review', prNumber: 12, commentId: 7 }),
    );
  });

  it('ignores comments that do not start with @clearpr', async () => {
    await useCase.execute({
      event: 'issue_comment',
      action: 'created',
      deliveryId: 'd-2',
      installationId: 999,
      body: {
        comment: { body: 'looks good!', id: 8 },
        issue: { number: 13 },
        repository: { id: 555, full_name: 'acme/widgets' },
      },
    });
    expect(jobEnqueuer.enqueueCommand).not.toHaveBeenCalled();
  });

  it('ignores unsupported subcommands', async () => {
    await useCase.execute({
      event: 'issue_comment',
      action: 'created',
      deliveryId: 'd-3',
      installationId: 999,
      body: {
        comment: { body: '@clearpr destroy-everything', id: 9 },
        issue: { number: 14 },
        repository: { id: 555, full_name: 'acme/widgets' },
      },
    });
    expect(jobEnqueuer.enqueueCommand).not.toHaveBeenCalled();
  });
});
