import type {
  ReviewJobPayload,
  CommandJobPayload,
  IndexingJobPayload,
} from '../../../queue/types/job-payload.types.js';

/**
 * Port for enqueuing review, command, and indexing jobs.
 *
 * Owned by the webhook module so its event handlers depend on a
 * contract rather than the queue module's concrete enqueue use case.
 * The binding lives in `WebhookModule`.
 */
export abstract class JobEnqueuerPort {
  abstract enqueueReview(payload: ReviewJobPayload): Promise<void>;

  abstract enqueueCommand(payload: CommandJobPayload): Promise<void>;

  abstract enqueueIndexing(payload: IndexingJobPayload): Promise<void>;
}
