import { type Provider } from '@nestjs/common';
import { AppConfig, LlmProvider } from '../../../config/app.config.js';
import { LlmProviderPort } from '../../domain/ports/llm-provider.port.js';
import { AnthropicLlmAdapter } from './anthropic-llm.adapter.js';
import { OpenAiLlmAdapter } from './openai-llm.adapter.js';
import { OllamaLlmAdapter } from './ollama-llm.adapter.js';
import { MistralLlmAdapter } from './mistral-llm.adapter.js';
import { GeminiLlmAdapter } from './gemini-llm.adapter.js';

export function createLlmProvider(): Provider<LlmProviderPort> {
  return {
    provide: LlmProviderPort,
    inject: [AppConfig],
    useFactory: (config: AppConfig): LlmProviderPort => {
      switch (config.LLM_PROVIDER) {
        case LlmProvider.ANTHROPIC:
          return new AnthropicLlmAdapter(config);
        case LlmProvider.OPENAI:
          return new OpenAiLlmAdapter(config);
        case LlmProvider.OLLAMA:
          return new OllamaLlmAdapter(config);
        case LlmProvider.MISTRAL:
          return new MistralLlmAdapter(config);
        case LlmProvider.GEMINI:
          return new GeminiLlmAdapter(config);
        default:
          throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER as string}`);
      }
    },
  };
}
