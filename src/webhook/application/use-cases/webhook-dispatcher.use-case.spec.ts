/* eslint-disable @typescript-eslint/unbound-method */
import { WebhookDispatcherService } from './webhook-dispatcher.use-case.js';
import { IdempotencyStorePort } from '../../domain/ports/idempotency-store.port.js';
import { ClearPrAction } from '../../domain/value-objects/webhook-event-type.vo.js';
import { EnqueueReviewUseCase } from './enqueue-review.use-case.js';
import { EnqueueCommandUseCase } from './enqueue-command.use-case.js';
import { RegisterInstallationUseCase } from './register-installation.use-case.js';
import { RemoveInstallationUseCase } from './remove-installation.use-case.js';
import { RegisterRepositoriesUseCase } from './register-repositories.use-case.js';
import { RemoveRepositoriesUseCase } from './remove-repositories.use-case.js';

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

function makeMockHandler<T>(): jest.Mocked<T> {
  return { execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<T>;
}

describe('WebhookDispatcherService', () => {
  let dispatcher: WebhookDispatcherService;
  let store: MockIdempotencyStore;
  let enqueueReview: jest.Mocked<EnqueueReviewUseCase>;
  let enqueueCommand: jest.Mocked<EnqueueCommandUseCase>;
  let registerInstallation: jest.Mocked<RegisterInstallationUseCase>;
  let removeInstallation: jest.Mocked<RemoveInstallationUseCase>;
  let registerRepositories: jest.Mocked<RegisterRepositoriesUseCase>;
  let removeRepositories: jest.Mocked<RemoveRepositoriesUseCase>;

  beforeEach(() => {
    store = new MockIdempotencyStore();
    enqueueReview = makeMockHandler<EnqueueReviewUseCase>();
    enqueueCommand = makeMockHandler<EnqueueCommandUseCase>();
    registerInstallation = makeMockHandler<RegisterInstallationUseCase>();
    removeInstallation = makeMockHandler<RemoveInstallationUseCase>();
    registerRepositories = makeMockHandler<RegisterRepositoriesUseCase>();
    removeRepositories = makeMockHandler<RemoveRepositoriesUseCase>();

    dispatcher = new WebhookDispatcherService(
      store,
      enqueueReview,
      enqueueCommand,
      registerInstallation,
      removeInstallation,
      registerRepositories,
      removeRepositories,
    );
  });

  it('routes pull_request.opened to EnqueueReviewUseCase', async () => {
    const result = await dispatcher.dispatch({
      event: 'pull_request',
      action: 'opened',
      deliveryId: 'delivery-1',
      installationId: 123,
      body: {},
    });
    expect(result.action).toBe(ClearPrAction.REVIEW_PR);
    expect(result.dispatched).toBe(true);
    expect(enqueueReview.execute).toHaveBeenCalledTimes(1);
    expect(enqueueCommand.execute).not.toHaveBeenCalled();
  });

  it('routes installation.created to RegisterInstallationUseCase', async () => {
    await dispatcher.dispatch({
      event: 'installation',
      action: 'created',
      deliveryId: 'delivery-2',
      installationId: 999,
      body: {},
    });
    expect(registerInstallation.execute).toHaveBeenCalledTimes(1);
  });

  it('routes installation.deleted to RemoveInstallationUseCase', async () => {
    await dispatcher.dispatch({
      event: 'installation',
      action: 'deleted',
      deliveryId: 'delivery-3',
      installationId: 999,
      body: {},
    });
    expect(removeInstallation.execute).toHaveBeenCalledTimes(1);
  });

  it('routes installation_repositories.added to RegisterRepositoriesUseCase', async () => {
    await dispatcher.dispatch({
      event: 'installation_repositories',
      action: 'added',
      deliveryId: 'delivery-4',
      installationId: 999,
      body: {},
    });
    expect(registerRepositories.execute).toHaveBeenCalledTimes(1);
  });

  it('routes installation_repositories.removed to RemoveRepositoriesUseCase', async () => {
    await dispatcher.dispatch({
      event: 'installation_repositories',
      action: 'removed',
      deliveryId: 'delivery-5',
      installationId: 999,
      body: {},
    });
    expect(removeRepositories.execute).toHaveBeenCalledTimes(1);
  });

  it('skips duplicate deliveries without invoking any handler', async () => {
    const payload = {
      event: 'pull_request',
      action: 'opened',
      deliveryId: 'delivery-dup',
      installationId: 123,
      body: {},
    };

    await dispatcher.dispatch(payload);
    enqueueReview.execute.mockClear();

    const result = await dispatcher.dispatch(payload);
    expect(result.dispatched).toBe(false);
    expect(result.reason).toBe('duplicate');
    expect(enqueueReview.execute).not.toHaveBeenCalled();
  });

  it('does not dispatch unknown events', async () => {
    const result = await dispatcher.dispatch({
      event: 'star',
      action: 'created',
      deliveryId: 'delivery-star',
      installationId: 123,
      body: {},
    });
    expect(result.dispatched).toBe(false);
    expect(result.reason).toBe('unhandled_event');
    expect(enqueueReview.execute).not.toHaveBeenCalled();
  });
});
