import { JsonNormalizer } from './json.normalizer.js';

describe('JsonNormalizer', () => {
  const normalizer = new JsonNormalizer();

  it('should produce same output regardless of key order', () => {
    const v1 = '{"b": 2, "a": 1}';
    const v2 = '{"a": 1, "b": 2}';
    expect(normalizer.normalize(v1)).toBe(normalizer.normalize(v2));
  });

  it('should ignore whitespace differences', () => {
    const v1 = '{ "a" :  1 }';
    const v2 = '{"a":1}';
    expect(normalizer.normalize(v1)).toBe(normalizer.normalize(v2));
  });

  it('should handle invalid JSON gracefully', () => {
    const invalid = '{not valid json}';
    expect(normalizer.normalize(invalid)).toBe(invalid.trim());
  });
});
