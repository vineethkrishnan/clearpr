export class SimilarityScore {
  constructor(readonly value: number) {
    if (value < 0 || value > 1) {
      throw new Error(`SimilarityScore must be between 0 and 1, got ${value}`);
    }
  }

  meetsThreshold(threshold: number): boolean {
    return this.value >= threshold;
  }
}
