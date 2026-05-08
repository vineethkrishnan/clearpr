/* eslint-disable @typescript-eslint/unbound-method */
import { EnqueueReviewUseCase } from './enqueue-review.use-case.js';
import { EnqueueJobUseCase } from '../../../queue/application/use-cases/enqueue-job.use-case.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { Repository } from '../../../github/domain/entities/repository.entity.js';

describe('EnqueueReviewUseCase', () => {
  let useCase: EnqueueReviewUseCase;
  let jobProducer: jest.Mocked<EnqueueJobUseCase>;
  let repositoryRepo: jest.Mocked<RepositoryRepositoryPort>;

  beforeEach(() => {
    jobProducer = {
      enqueueReview: jest.fn().mockResolvedValue(undefined),
      enqueueCommand: jest.fn().mockResolvedValue(undefined),
      enqueueIndexing: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EnqueueJobUseCase>;

    repositoryRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByGithubId: jest.fn(),
      findByInstallationId: jest.fn().mockResolvedValue([]),
      deleteByInstallationId: jest.fn().mockResolvedValue(0),
      deleteByGithubId: jest.fn().mockResolvedValue(null),
    };

    useCase = new EnqueueReviewUseCase(jobProducer, repositoryRepo);
  });

  it('enqueues a review job for tracked repositories', async () => {
    const dbRepo = Repository.create({
      installationId: 'inst-1',
      githubRepoId: 555,
      fullName: 'acme/widgets',
    });
    repositoryRepo.findByGithubId.mockResolvedValue(dbRepo);

    await useCase.execute({
      event: 'pull_request',
      action: 'opened',
      deliveryId: 'd-1',
      installationId: 999,
      body: {
        pull_request: { number: 42, head: { sha: 'abc' }, base: { ref: 'main' } },
        repository: { id: 555, full_name: 'acme/widgets' },
      },
    });

    expect(jobProducer.enqueueReview).toHaveBeenCalledTimes(1);
    expect(jobProducer.enqueueReview).toHaveBeenCalledWith(
      expect.objectContaining({
        prNumber: 42,
        prSha: 'abc',
        baseBranch: 'main',
        trigger: 'auto',
        repositoryId: dbRepo.id,
      }),
    );
  });

  it('skips when repository is not tracked', async () => {
    repositoryRepo.findByGithubId.mockResolvedValue(null);

    await useCase.execute({
      event: 'pull_request',
      action: 'opened',
      deliveryId: 'd-2',
      installationId: 999,
      body: {
        pull_request: { number: 1, head: { sha: 'x' }, base: { ref: 'main' } },
        repository: { id: 1, full_name: 'untracked/repo' },
      },
    });

    expect(jobProducer.enqueueReview).not.toHaveBeenCalled();
  });

  it('is a no-op when payload is missing pull_request or repository', async () => {
    await useCase.execute({
      event: 'pull_request',
      action: 'opened',
      deliveryId: 'd-3',
      installationId: 999,
      body: {},
    });
    expect(jobProducer.enqueueReview).not.toHaveBeenCalled();
  });
});
