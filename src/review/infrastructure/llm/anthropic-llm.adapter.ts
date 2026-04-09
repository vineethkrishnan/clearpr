import Anthropic from '@anthropic-ai/sdk';
import { LlmProviderPort } from '../../domain/ports/llm-provider.port.js';
import type { LlmResponse } from '../../application/types/llm-response.types.js';
import { LlmTimeoutError, LlmRateLimitError } from '../../domain/errors/review.errors.js';
import { AppConfig } from '../../../config/app.config.js';

export class AnthropicLlmAdapter extends LlmProviderPort {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: AppConfig) {
    super();
    this.client = new Anthropic({ apiKey: config.LLM_API_KEY });
    this.model = config.llmModelWithDefault;
  }

  async generateReview(prompt: string, maxTokens: number): Promise<LlmResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      return {
        content,
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        model: response.model,
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) {
          throw new LlmRateLimitError(60);
        }
        if (error.status === 408 || error.status === 504) {
          throw new LlmTimeoutError();
        }
      }
      throw error;
    }
  }
}
