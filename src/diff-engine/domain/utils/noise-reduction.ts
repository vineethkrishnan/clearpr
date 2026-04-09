export function calculateNoiseReductionPct(rawLines: number, semanticLines: number): number {
  if (rawLines === 0) return 0;
  return Math.round(((rawLines - semanticLines) / rawLines) * 10000) / 100;
}
