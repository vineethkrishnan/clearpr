import { Severity, meetsThreshold } from './severity.vo.js';

describe('Severity', () => {
  it('critical meets all thresholds', () => {
    expect(meetsThreshold(Severity.CRITICAL, Severity.INFO)).toBe(true);
    expect(meetsThreshold(Severity.CRITICAL, Severity.WARNING)).toBe(true);
    expect(meetsThreshold(Severity.CRITICAL, Severity.CRITICAL)).toBe(true);
  });

  it('info does not meet warning threshold', () => {
    expect(meetsThreshold(Severity.INFO, Severity.WARNING)).toBe(false);
  });

  it('warning meets warning threshold', () => {
    expect(meetsThreshold(Severity.WARNING, Severity.WARNING)).toBe(true);
  });
});
