import { ParseLlmResponseUseCase } from './parse-llm-response.use-case.js';
import { Severity } from '../../domain/value-objects/severity.vo.js';
import { MalformedLlmResponseError } from '../../domain/errors/review.errors.js';

describe('ParseLlmResponseUseCase', () => {
  const useCase = new ParseLlmResponseUseCase();

  it('parses valid JSON response with comments and summary', () => {
    const content = JSON.stringify({
      comments: [
        {
          path: 'src/foo.ts',
          line: 12,
          side: 'RIGHT',
          severity: 'critical',
          body: 'Null pointer risk.',
        },
        {
          path: 'src/bar.ts',
          line: 4,
          side: 'LEFT',
          severity: 'info',
          body: 'Consider renaming.',
        },
      ],
      summary: 'Two issues found.',
    });

    const result = useCase.execute(content);

    expect(result.summary).toBe('Two issues found.');
    expect(result.comments).toHaveLength(2);
    const [first, second] = result.comments;
    expect(first).toEqual({
      path: 'src/foo.ts',
      line: 12,
      side: 'RIGHT',
      severity: Severity.CRITICAL,
      body: 'Null pointer risk.',
    });
    expect(second?.side).toBe('LEFT');
    expect(second?.severity).toBe(Severity.INFO);
  });

  it('extracts JSON wrapped in markdown fences', () => {
    const content = [
      'Here is the review:',
      '```json',
      JSON.stringify({
        comments: [
          {
            path: 'a.ts',
            line: 1,
            severity: 'warning',
            body: 'Watch out.',
          },
        ],
        summary: 'One warning.',
      }),
      '```',
      'Hope this helps.',
    ].join('\n');

    const result = useCase.execute(content);

    expect(result.summary).toBe('One warning.');
    expect(result.comments).toHaveLength(1);
    const [only] = result.comments;
    expect(only?.severity).toBe(Severity.WARNING);
    // Defaults to RIGHT when side is not specified
    expect(only?.side).toBe('RIGHT');
  });

  it('throws MalformedLlmResponseError on malformed JSON', () => {
    expect(() => useCase.execute('not valid json at all')).toThrow(MalformedLlmResponseError);
    expect(() => useCase.execute('{ "comments": [ ')).toThrow(MalformedLlmResponseError);
  });

  it('coerces unknown severity to INFO and filters incomplete comments', () => {
    const content = JSON.stringify({
      comments: [
        {
          path: 'ok.ts',
          line: 5,
          severity: 'unknown-severity',
          body: 'Body here.',
        },
        {
          // missing path - should be filtered out
          line: 7,
          severity: 'critical',
          body: 'No path.',
        },
      ],
    });

    const result = useCase.execute(content);

    expect(result.comments).toHaveLength(1);
    const [comment] = result.comments;
    expect(comment?.severity).toBe(Severity.INFO);
    expect(result.summary).toBe('No summary provided.');
  });
});
