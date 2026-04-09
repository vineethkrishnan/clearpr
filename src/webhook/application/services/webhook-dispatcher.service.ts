import { Injectable, Logger } from '@nestjs/common';
import { IdempotencyStorePort } from '../../domain/ports/idempotency-store.port.js';
import { mapWebhookEvent, ClearPrAction } from '../../domain/value-objects/webhook-event-type.vo.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

export interface DispatchResult {
  action: ClearPrAction;
  dispatched: boolean;
  reason?: string;
}

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(private readonly idempotencyStore: IdempotencyStorePort) {}

  async dispatch(payload: WebhookPayload): Promise<DispatchResult> {
    // Check idempotency
    const isDuplicate = await this.idempotencyStore.exists(payload.deliveryId);
    if (isDuplicate) {
      this.logger.debug(
        { deliveryId: payload.deliveryId },
        'Duplicate delivery — skipping',
      );
      return { action: ClearPrAction.UNKNOWN, dispatched: false, reason: 'duplicate' };
    }

    // Mark as processed
    await this.idempotencyStore.mark(payload.deliveryId, payload.event, payload.action);

    // Map to ClearPR action
    const action = mapWebhookEvent(payload.event, payload.action);
    if (action === ClearPrAction.UNKNOWN) {
      this.logger.debug(
        { event: payload.event, action: payload.action },
        'Unhandled webhook event — ignoring',
      );
      return { action, dispatched: false, reason: 'unhandled_event' };
    }

    this.logger.log(
      {
        deliveryId: payload.deliveryId,
        event: payload.event,
        eventAction: payload.action,
        clearprAction: action,
        installationId: payload.installationId,
      },
      `Webhook dispatched: ${action}`,
    );

    // Queue the job — will be wired to JobProducerService in M1.9
    return { action, dispatched: true };
  }
}
