jest.mock('../../../github/application/use-cases/github-client.use-case.js', () => ({
  GitHubClientService: class {},
}));

import { RepositoryIndexerService } from './repository-indexer.use-case.js';
import { IndexMemoryUseCase } from './index-memory.use-case.js';
import { OutcomeDetectorService } from './outcome-detector.use-case.js';
import type { GitHubClientService } from '../../../github/application/use-cases/github-client.use-case.js';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { Installation } from '../../../github/domain/entities/installation.entity.js';
import { IndexingStatus, Repository } from '../../../github/domain/entities/repository.entity.js';
import { AppConfig } from '../../../config/app.config.js';
import { FeedbackOutcome } from '../../domain/value-objects/feedback-outcome.vo.js';

describe('RepositoryIndexerService', () => {
  let service: RepositoryIndexerService;
  let githubClient: jest.Mocked<GitHubClientService>;
  let installationRepo: jest.Mocked<InstallationRepositoryPort>;
  let repositoryRepo: jest.Mocked<RepositoryRepositoryPort>;
  let memoryIndexer: jest.Mocked<IndexMemoryUseCase>;
  let outcomeDetector: OutcomeDetectorService;

  const installation = Installation.create({
    githubInstallationId: 4242,
    accountLogin: 'acme',
    accountType: 'Organization',
  });
  const repository = Repository.create({
    installationId: installation.id,
    githubRepoId: 99,
    fullName: 'acme/widgets',
  });

  beforeEach(() => {
    githubClient = {
      listMergedPullRequests: jest.fn(),
      listPullRequestReviewComments: jest.fn(),
      listPullRequestCommits: jest.fn(),
    } as unknown as jest.Mocked<GitHubClientService>;

    installationRepo = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(installation),
      findByGithubId: jest.fn(),
    };
    repositoryRepo = {
      save: jest.fn().mockImplementation((r: Repository) => Promise.resolve(r)),
      findById: jest.fn(),
      findByGithubId: jest.fn(),
      findByInstallationId: jest.fn().mockResolvedValue([repository]),
      deleteByInstallationId: jest.fn(),
      deleteByGithubId: jest.fn(),
    };

    memoryIndexer = {
      indexComments: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<IndexMemoryUseCase>;

    outcomeDetector = new OutcomeDetectorService();

    const config = { HISTORY_DEPTH: 50 } as AppConfig;

    service = new RepositoryIndexerService(
      githubClient,
      installationRepo,
      repositoryRepo,
      outcomeDetector,
      memoryIndexer,
      config,
    );
  });

  it('marks the repository COMPLETED after a successful run', async () => {
    githubClient.listMergedPullRequests.mockResolvedValue([
      { number: 1, mergedAt: new Date('2026-01-10'), mergeCommitSha: 'abc', title: 'Feature' },
    ]);
    githubClient.listPullRequestReviewComments.mockResolvedValue([
      {
        id: 1,
        prNumber: 1,
        authorLogin: 'alice',
        body: 'consider null guard',
        filePath: 'src/foo.ts',
        startLine: null,
        line: 12,
        diffHunk: '@@',
        createdAt: new Date('2026-01-09'),
      },
    ]);
    githubClient.listPullRequestCommits.mockResolvedValue([
      { sha: 'def', committedAt: new Date('2026-01-09T10:00:00Z'), changedFiles: ['src/foo.ts'] },
    ]);

    await service.indexRepository(repository);

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(memoryIndexer.indexComments).toHaveBeenCalledTimes(1);
    const indexed = memoryIndexer.indexComments.mock.calls[0]![1];
    /* eslint-enable @typescript-eslint/unbound-method */
    expect(indexed).toHaveLength(1);
    expect(indexed[0]!.outcome).toBe(FeedbackOutcome.ACCEPTED);
    expect(repository.indexingStatus).toBe(IndexingStatus.COMPLETED);
  });

  it('marks the repository FAILED if a downstream call throws', async () => {
    githubClient.listMergedPullRequests.mockRejectedValue(new Error('boom'));

    await expect(service.indexRepository(repository)).rejects.toThrow('boom');
    expect(repository.indexingStatus).toBe(IndexingStatus.FAILED);
  });

  it('skips comments without a line number', async () => {
    githubClient.listMergedPullRequests.mockResolvedValue([
      { number: 7, mergedAt: new Date('2026-02-01'), mergeCommitSha: null, title: 'Other' },
    ]);
    githubClient.listPullRequestReviewComments.mockResolvedValue([
      {
        id: 5,
        prNumber: 7,
        authorLogin: 'bob',
        body: 'orphan',
        filePath: 'src/foo.ts',
        startLine: null,
        line: null,
        diffHunk: '',
        createdAt: new Date('2026-02-01'),
      },
    ]);
    githubClient.listPullRequestCommits.mockResolvedValue([]);

    await service.indexRepository(repository);
    const indexed = memoryIndexer.indexComments.mock.calls[0]![1];
    expect(indexed).toHaveLength(0);
  });

  it('indexInstallation iterates every repo for an installation', async () => {
    const second = Repository.create({
      installationId: installation.id,
      githubRepoId: 100,
      fullName: 'acme/other',
    });
    repositoryRepo.findByInstallationId.mockResolvedValue([repository, second]);
    githubClient.listMergedPullRequests.mockResolvedValue([]);

    const result = await service.indexInstallation(installation.id);
    expect(result.reposIndexed).toBe(2);
  });
});
