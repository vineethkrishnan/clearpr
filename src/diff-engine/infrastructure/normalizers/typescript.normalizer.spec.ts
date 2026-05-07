import { TypeScriptNormalizer } from './typescript.normalizer.js';

describe('TypeScriptNormalizer', () => {
  const normalizer = new TypeScriptNormalizer();

  it('should normalize double quotes to single quotes', () => {
    const input = 'const x = "hello";';
    const result = normalizer.normalize(input);
    expect(result).toContain("'hello'");
  });

  it('should remove trailing commas', () => {
    const input = 'const arr = [1, 2, 3,]';
    const result = normalizer.normalize(input);
    expect(result).toBe('const arr = [1, 2, 3]');
  });

  it('should remove semicolons', () => {
    const input = 'const x = 1;\nconst y = 2;';
    const result = normalizer.normalize(input);
    expect(result).not.toContain(';');
  });

  it('should sort import specifiers', () => {
    const input = "import { c, a, b } from './module'";
    const result = normalizer.normalize(input);
    expect(result).toContain('{ a, b, c }');
  });

  it('should collapse blank lines to a single newline (formatting noise)', () => {
    const input = 'a\n\n\n\nb';
    const result = normalizer.normalize(input);
    expect(result).toBe('a\nb');
  });

  it('should trim trailing whitespace per line', () => {
    const input = 'hello   \nworld   ';
    const result = normalizer.normalize(input);
    expect(result).toBe('hello\nworld');
  });

  it('should produce same output for formatting-only differences', () => {
    const v1 = 'import { b, a } from "./lib";\nconst x = 1;';
    const v2 = "import { a, b } from './lib'\nconst x = 1";
    expect(normalizer.normalize(v1)).toBe(normalizer.normalize(v2));
  });

  it('strips line and block comments', () => {
    const withComments = `// header\nconst x = 1; /* trailing */\n/**\n * docblock\n */\nfunction f() { return x }`;
    const withoutComments = `const x = 1\nfunction f() { return x }`;
    expect(normalizer.normalize(withComments)).toBe(normalizer.normalize(withoutComments));
  });

  it('does not corrupt double quotes inside strings when canonicalizing', () => {
    const source = `const x = "she said \\"hi\\"";`;
    const result = normalizer.normalize(source);
    // The literal payload should contain escaped double-quote characters,
    // not single-quote slashes that would change runtime behaviour.
    expect(result).toContain('"hi"');
    expect(result.startsWith("const x = '")).toBe(true);
  });

  it('treats reordered top-level statements as different', () => {
    const a = 'const x = 1\nconst y = 2';
    const b = 'const y = 2\nconst x = 1';
    // Ordering of statements is semantically meaningful — normalizer should
    // not collapse this difference.
    expect(normalizer.normalize(a)).not.toBe(normalizer.normalize(b));
  });
});
