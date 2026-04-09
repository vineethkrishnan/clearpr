import type { LlmResponse } from '../types/llm-response.types.js';

export abstract class LlmProviderPort {
  abstract generateReview(prompt: string, maxTokens: number): Promise<LlmResponse>;
}
