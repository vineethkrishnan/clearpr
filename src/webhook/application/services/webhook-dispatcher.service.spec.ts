import { WebhookDispatcherService } from './webhook-dispatcher.service.js';
import { IdempotencyStorePort } from '../../domain/ports/idempotency-store.port.js';
import { ClearPrAction } from '../../domain/value-objects/webhook-event-type.vo.js';

class MockIdempotencyStore extends IdempotencyStorePort {
  private store = new Set<string>();
  async exists(id: string): Promise<boolean> {
    return this.store.has(id);
  }
  async mark(id: string): Promise<void> {
    this.store.add(id);
  }
}

describe('WebhookDispatcherService', () => {
  let dispatcher: WebhookDispatcherService;
  let store: MockIdempotencyStore;

  beforeEach(() => {
    store = new MockIdempotencyStore();
    dispatcher = new WebhookDispatcherService(store);
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
});
