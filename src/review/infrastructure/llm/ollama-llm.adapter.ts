import OpenAI from 'openai';
import { LlmProviderPort } from '../../domain/ports/llm-provider.port.js';
import type { LlmResponse } from '../../application/types/llm-response.types.js';
import { AppConfig } from '../../../config/app.config.js';

export class OllamaLlmAdapter extends LlmProviderPort {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: AppConfig) {
    super();
    this.client = new OpenAI({
      apiKey: 'ollama',
      baseURL: config.LLM_BASE_URL ?? 'http://localhost:11434/v1',
    });
    this.model = config.llmModelWithDefault;
  }

  async generateReview(prompt: string, maxTokens: number): Promise<LlmResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      model: response.model,
    };
  }
}
