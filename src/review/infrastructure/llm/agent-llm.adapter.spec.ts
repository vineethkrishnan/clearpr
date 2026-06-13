import { AgentLlmAdapter } from './agent-llm.adapter.js';
import { AppConfig, LlmProvider } from '../../../config/app.config.js';
import { LlmTimeoutError, MalformedLlmResponseError } from '../../domain/errors/review.errors.js';

function buildConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const config = new AppConfig();
  config.LLM_PROVIDER = LlmProvider.AGENT;
  config.LLM_BASE_URL = 'http://agent.test:8765';
  config.LLM_API_KEY = 'secret-token';
  return Object.assign(config, overrides);
}

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function mockFetch(response: Response | Error): jest.MockedFunction<typeof fetch> {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  global.fetch = fetchMock;
  return fetchMock;
}

describe('AgentLlmAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws when LLM_BASE_URL is missing', () => {
    expect(() => new AgentLlmAdapter(buildConfig({ LLM_BASE_URL: undefined }))).toThrow();
  });

  it('maps a successful trigger response to an LlmResponse', async () => {
    const fetchMock = mockFetch(
      mockResponse(200, {
        ok: true,
        result: {
          is_error: false,
          result: 'review text',
          usage: { input_tokens: 120, output_tokens: 42 },
          modelUsage: { 'claude-opus-4-8[1m]': {} },
        },
      }),
    );

    const response = await new AgentLlmAdapter(buildConfig()).generateReview('prompt', 1000);

    expect(response).toEqual({
      content: 'review text',
      promptTokens: 120,
      completionTokens: 42,
      model: 'claude-opus-4-8[1m]',
    });

    const init = fetchMock.mock.calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://agent.test:8765/trigger');
    expect(headers['Authorization']).toBe('Bearer secret-token');
  });

  it('falls back to the default model when modelUsage is absent', async () => {
    mockFetch(mockResponse(200, { ok: true, result: { result: 'ok' } }));

    const response = await new AgentLlmAdapter(buildConfig()).generateReview('prompt', 1000);

    expect(response.model).toBe('claude-code');
    expect(response.promptTokens).toBe(0);
  });

  it('throws MalformedLlmResponseError when the agent reports an error result', async () => {
    mockFetch(mockResponse(200, { ok: true, result: { is_error: true, result: 'boom' } }));

    await expect(
      new AgentLlmAdapter(buildConfig()).generateReview('prompt', 1000),
    ).rejects.toBeInstanceOf(MalformedLlmResponseError);
  });

  it('throws MalformedLlmResponseError on a non-2xx status', async () => {
    mockFetch(mockResponse(401, { ok: false, error: 'unauthorized' }));

    await expect(
      new AgentLlmAdapter(buildConfig()).generateReview('prompt', 1000),
    ).rejects.toBeInstanceOf(MalformedLlmResponseError);
  });

  it('maps an aborted request to LlmTimeoutError', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    mockFetch(abortError);

    await expect(
      new AgentLlmAdapter(buildConfig()).generateReview('prompt', 1000),
    ).rejects.toBeInstanceOf(LlmTimeoutError);
  });
});
