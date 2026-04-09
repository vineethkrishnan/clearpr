export interface LlmResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
}
