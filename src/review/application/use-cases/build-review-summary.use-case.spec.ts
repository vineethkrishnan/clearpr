import { BuildReviewSummaryUseCase } from './build-review-summary.use-case.js';
import { Severity } from '../../domain/value-objects/severity.vo.js';
import type { ParsedReview } from '../../application/types/review-result.types.js';

describe('BuildReviewSummaryUseCase', () => {
  const useCase = new BuildReviewSummaryUseCase();

  const baseDiff = {
    totalRawLines: 1000,
    totalSemanticLines: 200,
    noiseReductionPct: 80,
  };

  it('renders "No issues found." when there are no comments', () => {
    const parsed: ParsedReview = { comments: [], summary: 'all clear' };

    const result = useCase.execute({ diff: baseDiff, parsed, hasGuidelines: false });

    expect(result).toContain('## ClearPR Review');
    expect(result).toContain('1,000 raw lines');
    expect(result).toContain('200 semantic lines');
    expect(result).toContain('80% noise filtered');
    expect(result).toContain('No issues found.');
    expect(result).not.toContain('### Findings');
    expect(result).not.toContain('Reviewed against project guidelines.');
  });

  it('renders mixed severity counts with correct pluralization', () => {
    const parsed: ParsedReview = {
      summary: 'mixed',
      comments: [
        { path: 'a.ts', line: 1, side: 'RIGHT', severity: Severity.CRITICAL, body: 'a' },
        { path: 'b.ts', line: 2, side: 'RIGHT', severity: Severity.WARNING, body: 'b' },
        { path: 'c.ts', line: 3, side: 'RIGHT', severity: Severity.WARNING, body: 'c' },
        { path: 'd.ts', line: 4, side: 'RIGHT', severity: Severity.INFO, body: 'd' },
      ],
    };

    const result = useCase.execute({ diff: baseDiff, parsed, hasGuidelines: false });

    expect(result).toContain('### Findings');
    expect(result).toContain('- 1 critical');
    expect(result).toContain('- 2 warnings');
    expect(result).toContain('- 1 info');
    expect(result).not.toContain('No issues found.');
  });

  it('appends guidelines footer when hasGuidelines is true', () => {
    const parsed: ParsedReview = {
      summary: '',
      comments: [
        { path: 'a.ts', line: 1, side: 'RIGHT', severity: Severity.WARNING, body: 'check' },
      ],
    };

    const withGuidelines = useCase.execute({ diff: baseDiff, parsed, hasGuidelines: true });
    const withoutGuidelines = useCase.execute({ diff: baseDiff, parsed, hasGuidelines: false });

    expect(withGuidelines).toContain('> Reviewed against project guidelines.');
    expect(withoutGuidelines).not.toContain('Reviewed against project guidelines.');
    // singular form for one warning
    expect(withGuidelines).toContain('- 1 warning');
    expect(withGuidelines).not.toContain('- 1 warnings');
  });
});
