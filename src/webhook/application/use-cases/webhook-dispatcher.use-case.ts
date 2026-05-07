import { Injectable, Logger } from '@nestjs/common';
import { IdempotencyStorePort } from '../../domain/ports/idempotency-store.port.js';
import {
  mapWebhookEvent,
  ClearPrAction,
} from '../../domain/value-objects/webhook-event-type.vo.js';
import { EnqueueReviewUseCase } from './enqueue-review.use-case.js';
import { EnqueueCommandUseCase } from './enqueue-command.use-case.js';
import { RegisterInstallationUseCase } from './register-installation.use-case.js';
import { RemoveInstallationUseCase } from './remove-installation.use-case.js';
import { RegisterRepositoriesUseCase } from './register-repositories.use-case.js';
import { RemoveRepositoriesUseCase } from './remove-repositories.use-case.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

export interface DispatchResult {
  action: ClearPrAction;
  dispatched: boolean;
  reason?: string;
}

interface ActionHandler {
  execute(payload: WebhookPayload): Promise<void>;
}

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);
  private readonly handlers: Partial<Record<ClearPrAction, ActionHandler>>;

  constructor(
    private readonly idempotencyStore: IdempotencyStorePort,
    private readonly enqueueReview: EnqueueReviewUseCase,
    private readonly enqueueCommand: EnqueueCommandUseCase,
    private readonly registerInstallation: RegisterInstallationUseCase,
    private readonly removeInstallation: RemoveInstallationUseCase,
    private readonly registerRepositories: RegisterRepositoriesUseCase,
    private readonly removeRepositories: RemoveRepositoriesUseCase,
  ) {
    // Routing table: ClearPrAction -> child use case
    this.handlers = {
      [ClearPrAction.REVIEW_PR]: this.enqueueReview,
      [ClearPrAction.PROCESS_COMMAND]: this.enqueueCommand,
      [ClearPrAction.INSTALLATION_CREATED]: this.registerInstallation,
      [ClearPrAction.INSTALLATION_DELETED]: this.removeInstallation,
      [ClearPrAction.REPOS_ADDED]: this.registerRepositories,
      [ClearPrAction.REPOS_REMOVED]: this.removeRepositories,
    };
  }

  async dispatch(payload: WebhookPayload): Promise<DispatchResult> {
    // Idempotency check
    const isDuplicate = await this.idempotencyStore.exists(payload.deliveryId);
    if (isDuplicate) {
      this.logger.debug({ deliveryId: payload.deliveryId }, 'Duplicate delivery — skipping');
      return { action: ClearPrAction.UNKNOWN, dispatched: false, reason: 'duplicate' };
    }

    await this.idempotencyStore.mark(payload.deliveryId, payload.event, payload.action);

    // Resolve action and route to child use case
    const action = mapWebhookEvent(payload.event, payload.action);
    if (action === ClearPrAction.UNKNOWN) {
      return { action, dispatched: false, reason: 'unhandled_event' };
    }

    this.logger.log(
      {
        deliveryId: payload.deliveryId,
        clearprAction: action,
        installationId: payload.installationId,
      },
      `Webhook dispatched: ${action}`,
    );

    const handler = this.handlers[action];
    if (handler) {
      await handler.execute(payload);
    }

    return { action, dispatched: true };
  }
}
