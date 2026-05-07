import { PhpNormalizer } from './php.normalizer.js';

describe('PhpNormalizer', () => {
  const normalizer = new PhpNormalizer();

  it('strips line and block comments', () => {
    const withComments = `<?php\n// header\n$x = 1; /* inline */\n# also a comment\n/**\n * doc\n */\nfunction f() { return $x; }`;
    const withoutComments = `<?php\n$x = 1;\nfunction f() { return $x; }`;
    expect(normalizer.normalize(withComments)).toBe(normalizer.normalize(withoutComments));
  });

  it('canonicalizes simple double-quoted strings to single quotes', () => {
    const v1 = `<?php\n$x = "hello";`;
    const v2 = `<?php\n$x = 'hello';`;
    expect(normalizer.normalize(v1)).toBe(normalizer.normalize(v2));
  });

  it('does not rewrite double-quoted strings that interpolate variables', () => {
    const source = `<?php\n$msg = "hi $name";`;
    const result = normalizer.normalize(source);
    expect(result).toContain('"hi $name"');
  });

  it('does not corrupt content of strings while normalizing whitespace', () => {
    const source = `<?php\n$x = "  spaced  string  ";`;
    const result = normalizer.normalize(source);
    expect(result).toContain('  spaced  string  ');
  });

  it('sorts use statements alphabetically', () => {
    const v1 = `<?php\nuse App\\B;\nuse App\\A;\n`;
    const v2 = `<?php\nuse App\\A;\nuse App\\B;\n`;
    expect(normalizer.normalize(v1)).toBe(normalizer.normalize(v2));
  });

  it('removes trailing commas before close brackets', () => {
    const v1 = `<?php\n$arr = [1, 2, 3,];`;
    const v2 = `<?php\n$arr = [1, 2, 3];`;
    expect(normalizer.normalize(v1)).toBe(normalizer.normalize(v2));
  });
});
