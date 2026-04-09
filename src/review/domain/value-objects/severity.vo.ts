export enum Severity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

const SEVERITY_ORDER: Record<Severity, number> = {
  [Severity.CRITICAL]: 3,
  [Severity.WARNING]: 2,
  [Severity.INFO]: 1,
};

export function meetsThreshold(severity: Severity, threshold: Severity): boolean {
  return (SEVERITY_ORDER[severity] ?? 0) >= (SEVERITY_ORDER[threshold] ?? 0);
}
