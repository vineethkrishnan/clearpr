import { Injectable, Logger } from '@nestjs/common';
import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { EmbeddingProviderPort } from '../../domain/ports/embedding-provider.port.js';
import { EmbeddingApiError } from '../../domain/errors/memory.errors.js';
import { AppConfig } from '../../../config/app.config.js';

const DEFAULT_LOCAL_MODEL = 'Xenova/all-MiniLM-L6-v2';

@Injectable()
export class LocalEmbeddingAdapter extends EmbeddingProviderPort {
  private readonly logger = new Logger(LocalEmbeddingAdapter.name);
  private readonly model: string;
  private extractor?: Promise<FeatureExtractionPipeline>;

  constructor(config: AppConfig) {
    super();
    this.model = config.EMBEDDING_MODEL ?? DEFAULT_LOCAL_MODEL;
    if (config.EMBEDDING_CACHE_DIR) {
      env.cacheDir = config.EMBEDDING_CACHE_DIR;
    }
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    if (!vector) throw new EmbeddingApiError('Empty embedding result');
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const extractor = await this.loadExtractor();
      const output = await extractor(texts, { pooling: 'mean', normalize: true });
      return output.tolist() as number[][];
    } catch (error) {
      this.logger.error('Local embedding failed', error instanceof Error ? error.message : '');
      throw new EmbeddingApiError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private loadExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractor) {
      this.extractor = pipeline('feature-extraction', this.model);
    }
    return this.extractor;
  }
}
