import { ok, err, type Result } from './result.types.js';

describe('Result', () => {
  it('ok should be Ok', () => {
    const result: Result<number> = ok(42);
    expect(result.isOk()).toBe(true);
    expect(result.isErr()).toBe(false);
    if (result.isOk()) {
      expect(result.value).toBe(42);
    }
  });

  it('err should be Err', () => {
    const error = new Error('fail');
    const result: Result<number> = err(error);
    expect(result.isOk()).toBe(false);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('fail');
    }
  });
});
