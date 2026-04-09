import OpenAI from 'openai';
import { LlmProviderPort } from '../../domain/ports/llm-provider.port.js';
import type { LlmResponse } from '../../application/types/llm-response.types.js';
import { LlmTimeoutError, LlmRateLimitError } from '../../domain/errors/review.errors.js';
import { AppConfig } from '../../../config/app.config.js';

export class OpenAiLlmAdapter extends LlmProviderPort {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: AppConfig) {
    super();
    this.client = new OpenAI({
      apiKey: config.LLM_API_KEY,
      baseURL: config.LLM_BASE_URL,
    });
    this.model = config.llmModelWithDefault;
  }

  async generateReview(prompt: string, maxTokens: number): Promise<LlmResponse> {
    try {
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
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) throw new LlmRateLimitError(60);
        if (error.status === 408 || error.status === 504) throw new LlmTimeoutError();
      }
      throw error;
    }
  }
}
