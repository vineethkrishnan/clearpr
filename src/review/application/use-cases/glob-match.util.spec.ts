import { globToRegex, matchesAnyPattern } from './glob-match.util.js';

describe('globToRegex', () => {
  it('matches exact paths', () => {
    expect(globToRegex('package-lock.json').test('package-lock.json')).toBe(true);
    expect(globToRegex('package-lock.json').test('src/package-lock.json')).toBe(false);
  });

  it('matches single-segment wildcards', () => {
    const re = globToRegex('*.min.js');
    expect(re.test('app.min.js')).toBe(true);
    expect(re.test('src/app.min.js')).toBe(false);
  });

  it('matches double-star recursive wildcards', () => {
    const re = globToRegex('**/*.generated.ts');
    expect(re.test('user.generated.ts')).toBe(true);
    expect(re.test('src/models/user.generated.ts')).toBe(true);
    expect(re.test('src/models/user.ts')).toBe(false);
  });

  it('matches prefixed recursive wildcards', () => {
    const re = globToRegex('vendor/**');
    expect(re.test('vendor/lib/a.js')).toBe(true);
    expect(re.test('src/vendor/lib/a.js')).toBe(false);
  });

  it('escapes regex specials in literal paths', () => {
    const re = globToRegex('src/a.b+c.ts');
    expect(re.test('src/a.b+c.ts')).toBe(true);
    expect(re.test('src/aXbXc.ts')).toBe(false);
  });
});

describe('matchesAnyPattern', () => {
  it('returns true if any pattern matches', () => {
    expect(matchesAnyPattern('src/generated/api.ts', ['vendor/**', '**/generated/**'])).toBe(true);
  });

  it('returns false when no pattern matches', () => {
    expect(matchesAnyPattern('src/user.ts', ['**/*.generated.ts'])).toBe(false);
  });

  it('returns false on empty pattern list', () => {
    expect(matchesAnyPattern('src/user.ts', [])).toBe(false);
  });
});
