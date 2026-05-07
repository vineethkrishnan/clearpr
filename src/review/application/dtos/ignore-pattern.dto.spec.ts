import { IGNORE_PATTERN_MAX_LENGTH, validateIgnorePattern } from './ignore-pattern.dto.js';

describe('validateIgnorePattern', () => {
  it('accepts a simple double-star glob', async () => {
    const result = await validateIgnorePattern('**/*.generated.ts');
    expect(result.errorMessage).toBeNull();
    expect(result.dto?.pattern).toBe('**/*.generated.ts');
  });

  it('accepts patterns with brackets, hyphens, dots, and underscores', async () => {
    const result = await validateIgnorePattern('docs/**/_archive-[0-9].md');
    expect(result.errorMessage).toBeNull();
    expect(result.dto?.pattern).toBe('docs/**/_archive-[0-9].md');
  });

  it('trims surrounding whitespace before validating', async () => {
    const result = await validateIgnorePattern('   **/*.lock   ');
    expect(result.errorMessage).toBeNull();
    expect(result.dto?.pattern).toBe('**/*.lock');
  });

  it('rejects empty input', async () => {
    const result = await validateIgnorePattern('   ');
    expect(result.dto).toBeNull();
    expect(result.errorMessage).toBeTruthy();
  });

  it('rejects patterns longer than the cap', async () => {
    const oversized = 'a'.repeat(IGNORE_PATTERN_MAX_LENGTH + 1);
    const result = await validateIgnorePattern(oversized);
    expect(result.dto).toBeNull();
    expect(result.errorMessage).toMatch(/shorter|longer|maximum|length/i);
  });

  it('rejects patterns containing shell metacharacters', async () => {
    const result = await validateIgnorePattern('foo;rm -rf /');
    expect(result.dto).toBeNull();
    expect(result.errorMessage).toContain('not allowed');
  });

  it('rejects patterns containing backticks or dollar-signs', async () => {
    const dollarResult = await validateIgnorePattern('$(echo bad)');
    expect(dollarResult.dto).toBeNull();
    const backtickResult = await validateIgnorePattern('`whoami`');
    expect(backtickResult.dto).toBeNull();
  });

  it('rejects patterns with non-ASCII payloads', async () => {
    const result = await validateIgnorePattern('тест/**/*.ts');
    expect(result.dto).toBeNull();
  });
});
