export abstract class IdempotencyStorePort {
  abstract exists(deliveryId: string): Promise<boolean>;
  abstract mark(deliveryId: string, event: string, action?: string): Promise<void>;
}
