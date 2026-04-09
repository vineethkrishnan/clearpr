import { Mistral } from '@mistralai/mistralai';
import { LlmProviderPort } from '../../domain/ports/llm-provider.port.js';
import type { LlmResponse } from '../../application/types/llm-response.types.js';
import { LlmRateLimitError } from '../../domain/errors/review.errors.js';
import { AppConfig } from '../../../config/app.config.js';

export class MistralLlmAdapter extends LlmProviderPort {
  private readonly client: Mistral;
  private readonly model: string;

  constructor(config: AppConfig) {
    super();
    this.client = new Mistral({ apiKey: config.LLM_API_KEY });
    this.model = config.llmModelWithDefault;
  }

  async generateReview(prompt: string, maxTokens: number): Promise<LlmResponse> {
    try {
      const response = await this.client.chat.complete({
        model: this.model,
        maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      return {
        content: response.choices?.[0]?.message?.content?.toString() ?? '',
        promptTokens: response.usage?.promptTokens ?? 0,
        completionTokens: response.usage?.completionTokens ?? 0,
        model: response.model ?? this.model,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        throw new LlmRateLimitError(60);
      }
      throw error;
    }
  }
}
