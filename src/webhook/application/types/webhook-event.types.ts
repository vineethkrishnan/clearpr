import type { WebhookEventDto } from '../dtos/webhook-event.dto.js';

export interface WebhookPayload {
  event: string;
  action: string;
  deliveryId: string;
  installationId: number;
  body: WebhookEventDto;
}
