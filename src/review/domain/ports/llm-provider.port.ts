import type { LlmResponse } from '../../application/types/llm-response.types.js';

export abstract class LlmProviderPort {
  abstract generateReview(prompt: string, maxTokens: number): Promise<LlmResponse>;
}
