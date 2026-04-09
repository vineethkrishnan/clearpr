import { Injectable } from '@nestjs/common';
import { FeedbackOutcome } from '../../domain/value-objects/feedback-outcome.vo.js';

export interface CommentOutcomeInput {
  commentCreatedAt: Date;
  filePath: string;
  lineRange: [number, number];
  subsequentCommits: Array<{
    committedAt: Date;
    changedFiles: string[];
  }>;
}

@Injectable()
export class OutcomeDetectorService {
  detect(input: CommentOutcomeInput): FeedbackOutcome {
    // Find commits after the comment within the same PR
    const commitsAfterComment = input.subsequentCommits.filter(
      (c) => c.committedAt > input.commentCreatedAt,
    );

    // If any subsequent commit modified the same file → accepted
    const fileWasChanged = commitsAfterComment.some((c) =>
      c.changedFiles.includes(input.filePath),
    );

    return fileWasChanged ? FeedbackOutcome.ACCEPTED : FeedbackOutcome.DISMISSED;
  }
}
