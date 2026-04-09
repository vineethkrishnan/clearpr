import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingProviderPort } from '../../domain/ports/embedding-provider.port.js';
import { EmbeddingApiError } from '../../domain/errors/memory.errors.js';
import { AppConfig } from '../../../config/app.config.js';

@Injectable()
export class VoyageEmbeddingAdapter extends EmbeddingProviderPort {
  private readonly logger = new Logger(VoyageEmbeddingAdapter.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: AppConfig) {
    super();
    this.apiKey = config.VOYAGE_API_KEY ?? '';
    this.model = config.EMBEDDING_MODEL;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    const result = results[0];
    if (!result) throw new EmbeddingApiError('Empty embedding result');
    return result;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: texts,
          model: this.model,
        }),
      });

      if (!response.ok) {
        throw new EmbeddingApiError(`Voyage API returned ${response.status}`);
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
      };

      return data.data.map((d) => d.embedding);
    } catch (error) {
      if (error instanceof EmbeddingApiError) throw error;
      this.logger.error('Embedding API call failed', error instanceof Error ? error.message : '');
      throw new EmbeddingApiError(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
