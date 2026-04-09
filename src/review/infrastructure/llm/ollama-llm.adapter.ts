import { OpenAiLlmAdapter } from './openai-llm.adapter.js';
import { AppConfig } from '../../../config/app.config.js';

// Ollama uses the OpenAI-compatible API — reuse the adapter with Ollama-specific defaults
export class OllamaLlmAdapter extends OpenAiLlmAdapter {
  constructor(config: AppConfig) {
    super({
      ...config,
      LLM_API_KEY: 'ollama',
      LLM_BASE_URL: config.LLM_BASE_URL ?? 'http://localhost:11434/v1',
    } as AppConfig);
  }
}
