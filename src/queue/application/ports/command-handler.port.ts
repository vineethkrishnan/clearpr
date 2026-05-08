import type { CommandJobPayload } from '../../types/job-payload.types.js';

/**
 * Port for handling @clearpr slash commands posted as PR comments.
 *
 * Owned by the queue module so its command consumer depends on a
 * contract rather than the review module's concrete handler use case.
 * The binding lives in `QueueModule`.
 */
export abstract class CommandHandlerPort {
  abstract handle(payload: CommandJobPayload): Promise<void>;
}
