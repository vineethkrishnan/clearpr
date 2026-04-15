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

  it('should collapse multiple blank lines', () => {
    const input = 'a\n\n\n\nb';
    const result = normalizer.normalize(input);
    expect(result).toBe('a\n\nb');
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
});
