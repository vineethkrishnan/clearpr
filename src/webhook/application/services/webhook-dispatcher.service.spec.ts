/* eslint-disable @typescript-eslint/unbound-method */
import { WebhookDispatcherService } from './webhook-dispatcher.service.js';
import { IdempotencyStorePort } from '../../domain/ports/idempotency-store.port.js';
import { ClearPrAction } from '../../domain/value-objects/webhook-event-type.vo.js';
import { JobProducerService } from '../../../queue/producers/job-producer.service.js';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { InstallationCleanupService } from '../../../review/application/services/installation-cleanup.service.js';
import { Installation } from '../../../github/domain/entities/installation.entity.js';
import { Repository } from '../../../github/domain/entities/repository.entity.js';

class MockIdempotencyStore extends IdempotencyStorePort {
  private store = new Set<string>();
  async exists(id: string): Promise<boolean> {
    await Promise.resolve();
    return this.store.has(id);
  }
  async mark(id: string): Promise<void> {
    await Promise.resolve();
    this.store.add(id);
  }
}

describe('WebhookDispatcherService', () => {
  let dispatcher: WebhookDispatcherService;
  let store: MockIdempotencyStore;
  let jobProducer: jest.Mocked<JobProducerService>;
  let installationRepo: jest.Mocked<InstallationRepositoryPort>;
  let repositoryRepo: jest.Mocked<RepositoryRepositoryPort>;
  let cleanupService: jest.Mocked<InstallationCleanupService>;

  beforeEach(() => {
    store = new MockIdempotencyStore();
    jobProducer = {
      enqueueReview: jest.fn().mockResolvedValue(undefined),
      enqueueCommand: jest.fn().mockResolvedValue(undefined),
      enqueueIndexing: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<JobProducerService>;
    installationRepo = {
      save: jest.fn().mockImplementation((inst: Installation) => Promise.resolve(inst)),
      findByGithubId: jest.fn().mockResolvedValue(null),
    };
    repositoryRepo = {
      save: jest.fn().mockImplementation((repo: Repository) => Promise.resolve(repo)),
      findByGithubId: jest.fn().mockResolvedValue(null),
      findByInstallationId: jest.fn().mockResolvedValue([]),
      deleteByInstallationId: jest.fn().mockResolvedValue(0),
      deleteByGithubId: jest.fn().mockResolvedValue(null),
    };
    cleanupService = {
      cleanupInstallation: jest.fn().mockResolvedValue({
        repositoriesDeleted: 0,
        reviewsDeleted: 0,
        memoryEntriesDeleted: 0,
      }),
      cleanupRepository: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<InstallationCleanupService>;

    dispatcher = new WebhookDispatcherService(
      store,
      jobProducer,
      installationRepo,
      repositoryRepo,
      cleanupService,
    );
  });

  it('should dispatch pull_request.opened as REVIEW_PR', async () => {
    const result = await dispatcher.dispatch({
      event: 'pull_request',
      action: 'opened',
      deliveryId: 'delivery-1',
      installationId: 123,
      body: {},
    });
    expect(result.action).toBe(ClearPrAction.REVIEW_PR);
    expect(result.dispatched).toBe(true);
  });

  it('should skip duplicate deliveries', async () => {
    const payload = {
      event: 'pull_request',
      action: 'opened',
      deliveryId: 'delivery-dup',
      installationId: 123,
      body: {},
    };

    await dispatcher.dispatch(payload);
    const result = await dispatcher.dispatch(payload);
    expect(result.dispatched).toBe(false);
    expect(result.reason).toBe('duplicate');
  });

  it('should not dispatch unknown events', async () => {
    const result = await dispatcher.dispatch({
      event: 'star',
      action: 'created',
      deliveryId: 'delivery-star',
      installationId: 123,
      body: {},
    });
    expect(result.dispatched).toBe(false);
    expect(result.reason).toBe('unhandled_event');
  });

  describe('installation.deleted', () => {
    it('invokes cleanup service with installation id', async () => {
      const installation = Installation.create({
        githubInstallationId: 999,
        accountLogin: 'acme',
        accountType: 'Organization',
      });
      installationRepo.findByGithubId.mockResolvedValue(installation);

      await dispatcher.dispatch({
        event: 'installation',
        action: 'deleted',
        deliveryId: 'delivery-deleted',
        installationId: 999,
        body: { installation: { id: 999 } },
      });

      expect(cleanupService.cleanupInstallation).toHaveBeenCalledWith(installation.id, 999);
    });

    it('skips cleanup when installation is not tracked', async () => {
      installationRepo.findByGithubId.mockResolvedValue(null);

      await dispatcher.dispatch({
        event: 'installation',
        action: 'deleted',
        deliveryId: 'delivery-untracked',
        installationId: 42,
        body: { installation: { id: 42 } },
      });

      expect(cleanupService.cleanupInstallation).not.toHaveBeenCalled();
    });
  });

  describe('installation_repositories.removed', () => {
    it('invokes cleanup per removed repository', async () => {
      cleanupService.cleanupRepository.mockResolvedValueOnce({
        repositoriesDeleted: 1,
        reviewsDeleted: 5,
        memoryEntriesDeleted: 12,
      });

      await dispatcher.dispatch({
        event: 'installation_repositories',
        action: 'removed',
        deliveryId: 'delivery-repo-removed',
        installationId: 999,
        body: {
          installation: { id: 999 },
          repositories_removed: [{ id: 111, full_name: 'acme/retired' }],
        },
      });

      expect(cleanupService.cleanupRepository).toHaveBeenCalledWith(111);
    });

    it('is a no-op when repositories_removed is empty', async () => {
      await dispatcher.dispatch({
        event: 'installation_repositories',
        action: 'removed',
        deliveryId: 'delivery-empty-removed',
        installationId: 999,
        body: { installation: { id: 999 }, repositories_removed: [] },
      });

      expect(cleanupService.cleanupRepository).not.toHaveBeenCalled();
    });
  });
});
