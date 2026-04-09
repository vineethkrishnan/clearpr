import { GoogleGenerativeAI } from '@google/generative-ai';
import { LlmProviderPort } from '../../domain/ports/llm-provider.port.js';
import type { LlmResponse } from '../../domain/types/llm-response.types.js';
import { AppConfig } from '../../../config/app.config.js';

export class GeminiLlmAdapter extends LlmProviderPort {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string;

  constructor(config: AppConfig) {
    super();
    this.genAI = new GoogleGenerativeAI(config.LLM_API_KEY ?? '');
    this.model = config.llmModelWithDefault;
  }

  async generateReview(prompt: string, maxTokens: number): Promise<LlmResponse> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: { maxOutputTokens: maxTokens },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const usage = response.usageMetadata;

    return {
      content: text,
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
      model: this.model,
    };
  }
}
