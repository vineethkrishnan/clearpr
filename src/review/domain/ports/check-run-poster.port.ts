import type { ReviewContext } from '../types/review-context.types.js';

export type CheckRunConclusion = 'success' | 'neutral' | 'failure';

export abstract class CheckRunPosterPort {
  abstract createInProgress(context: ReviewContext): Promise<number>;
  abstract complete(
    context: ReviewContext,
    checkRunId: number,
    conclusion: CheckRunConclusion,
    output: { title: string; summary: string },
  ): Promise<void>;
}
