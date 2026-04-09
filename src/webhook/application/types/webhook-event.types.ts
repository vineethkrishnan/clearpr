export interface WebhookPayload {
  event: string;
  action: string;
  deliveryId: string;
  installationId: number;
  body: Record<string, unknown>;
}
