import { YamlNormalizer } from './yaml.normalizer.js';

describe('YamlNormalizer', () => {
  const normalizer = new YamlNormalizer();

  it('should produce same output regardless of key order', () => {
    const v1 = 'b: 2\na: 1';
    const v2 = 'a: 1\nb: 2';
    expect(normalizer.normalize(v1)).toBe(normalizer.normalize(v2));
  });

  it('should ignore comment differences', () => {
    const v1 = '# comment 1\na: 1';
    const v2 = '# different comment\na: 1';
    expect(normalizer.normalize(v1)).toBe(normalizer.normalize(v2));
  });

  it('should handle invalid YAML gracefully', () => {
    const invalid = ':::invalid:::';
    const result = normalizer.normalize(invalid);
    expect(result).toBeDefined();
  });
});
