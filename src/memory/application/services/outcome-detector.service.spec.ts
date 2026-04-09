import { OutcomeDetectorService } from './outcome-detector.service.js';
import { FeedbackOutcome } from '../../domain/value-objects/feedback-outcome.vo.js';

describe('OutcomeDetectorService', () => {
  const detector = new OutcomeDetectorService();

  it('should return ACCEPTED when file was changed after comment', () => {
    const result = detector.detect({
      commentCreatedAt: new Date('2024-01-01T10:00:00Z'),
      filePath: 'src/auth.ts',
      lineRange: [10, 20],
      subsequentCommits: [
        {
          committedAt: new Date('2024-01-01T11:00:00Z'),
          changedFiles: ['src/auth.ts', 'src/other.ts'],
        },
      ],
    });
    expect(result).toBe(FeedbackOutcome.ACCEPTED);
  });

  it('should return DISMISSED when file was not changed after comment', () => {
    const result = detector.detect({
      commentCreatedAt: new Date('2024-01-01T10:00:00Z'),
      filePath: 'src/auth.ts',
      lineRange: [10, 20],
      subsequentCommits: [
        {
          committedAt: new Date('2024-01-01T11:00:00Z'),
          changedFiles: ['src/other.ts'],
        },
      ],
    });
    expect(result).toBe(FeedbackOutcome.DISMISSED);
  });

  it('should return DISMISSED when no commits after comment', () => {
    const result = detector.detect({
      commentCreatedAt: new Date('2024-01-01T10:00:00Z'),
      filePath: 'src/auth.ts',
      lineRange: [10, 20],
      subsequentCommits: [
        {
          committedAt: new Date('2024-01-01T09:00:00Z'),
          changedFiles: ['src/auth.ts'],
        },
      ],
    });
    expect(result).toBe(FeedbackOutcome.DISMISSED);
  });
});
