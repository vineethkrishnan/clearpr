export abstract class EmbeddingProviderPort {
  abstract embed(text: string): Promise<number[]>;
  abstract embedBatch(texts: string[]): Promise<number[][]>;
}
