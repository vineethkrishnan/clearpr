const pipelineMock = jest.fn<Promise<unknown>, unknown[]>();

jest.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]): Promise<unknown> => pipelineMock(...args),
  env: { backends: { onnx: { wasm: {} } }, cacheDir: '' },
}));

import { LocalEmbeddingAdapter } from './local-embedding.adapter.js';
import { AppConfig, EmbeddingProvider } from '../../../config/app.config.js';
import { EmbeddingApiError } from '../../domain/errors/memory.errors.js';

function buildConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const config = new AppConfig();
  config.EMBEDDING_PROVIDER = EmbeddingProvider.LOCAL;
  return Object.assign(config, overrides);
}

describe('LocalEmbeddingAdapter', () => {
  afterEach(() => jest.clearAllMocks());

  it('loads the default model and maps the tensor to number[][]', async () => {
    const extractor = jest.fn().mockResolvedValue({ tolist: () => [[0.1, 0.2, 0.3]] });
    pipelineMock.mockResolvedValue(extractor);

    const result = await new LocalEmbeddingAdapter(buildConfig()).embedBatch(['hello']);

    expect(result).toEqual([[0.1, 0.2, 0.3]]);
    expect(pipelineMock).toHaveBeenCalledWith('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    expect(extractor).toHaveBeenCalledWith(['hello'], { pooling: 'mean', normalize: true });
  });

  it('honours an EMBEDDING_MODEL override and caches the pipeline across calls', async () => {
    const extractor = jest.fn().mockResolvedValue({ tolist: () => [[1]] });
    pipelineMock.mockResolvedValue(extractor);

    const adapter = new LocalEmbeddingAdapter(
      buildConfig({ EMBEDDING_MODEL: 'Xenova/bge-small-en' }),
    );
    await adapter.embed('a');
    await adapter.embed('b');

    expect(pipelineMock).toHaveBeenCalledTimes(1);
    expect(pipelineMock).toHaveBeenCalledWith('feature-extraction', 'Xenova/bge-small-en');
  });

  it('returns the single vector from embed()', async () => {
    pipelineMock.mockResolvedValue(jest.fn().mockResolvedValue({ tolist: () => [[0.5, 0.6]] }));

    const vector = await new LocalEmbeddingAdapter(buildConfig()).embed('x');

    expect(vector).toEqual([0.5, 0.6]);
  });

  it('wraps inference failures in EmbeddingApiError', async () => {
    pipelineMock.mockRejectedValue(new Error('model load failed'));

    await expect(new LocalEmbeddingAdapter(buildConfig()).embed('x')).rejects.toBeInstanceOf(
      EmbeddingApiError,
    );
  });
});
