import { parseClearPrCommand } from './clearpr-command.dto.js';

describe('parseClearPrCommand', () => {
  it('parses a simple command with no args', () => {
    const parsed = parseClearPrCommand('@clearpr review');
    expect(parsed).not.toBeNull();
    expect(parsed?.command).toBe('review');
    expect(parsed?.args).toBeUndefined();
  });

  it('parses a command with args (preserves arg-only whitespace collapse)', () => {
    const parsed = parseClearPrCommand('@clearpr ignore **/*.generated.ts');
    expect(parsed?.command).toBe('ignore');
    expect(parsed?.args).toBe('**/*.generated.ts');
  });

  it('lowercases command and args (Github comment is case-insensitive for routing)', () => {
    const parsed = parseClearPrCommand('@ClearPR DIFF');
    expect(parsed?.command).toBe('diff');
  });

  it('joins multi-token args with single spaces', () => {
    const parsed = parseClearPrCommand('@clearpr ignore   **/*.gen.ts   docs/**');
    expect(parsed?.args).toBe('**/*.gen.ts docs/**');
  });

  it('returns null for an unsupported subcommand', () => {
    expect(parseClearPrCommand('@clearpr destroy-everything')).toBeNull();
  });

  it('returns null when the bare @clearpr mention has no subcommand', () => {
    expect(parseClearPrCommand('@clearpr')).toBeNull();
  });

  it('returns null for unrelated comments', () => {
    expect(parseClearPrCommand('looks good!')).toBeNull();
    expect(parseClearPrCommand('@someone-else review')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseClearPrCommand('')).toBeNull();
    expect(parseClearPrCommand('   ')).toBeNull();
  });
});
