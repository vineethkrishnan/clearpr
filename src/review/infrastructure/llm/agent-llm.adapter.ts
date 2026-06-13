import { AGENT_REQUEST_TIMEOUT_MS } from './llm-constants.js';
import { LlmProviderPort } from '../../domain/ports/llm-provider.port.js';
import type { LlmResponse } from '../../domain/types/llm-response.types.js';
import { LlmTimeoutError, MalformedLlmResponseError } from '../../domain/errors/review.errors.js';
import { AppConfig } from '../../../config/app.config.js';

interface AgentTriggerResponse {
  ok: boolean;
  error?: string;
  result?: ClaudeCodeResult;
}

interface ClaudeCodeResult {
  is_error?: boolean;
  result?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  modelUsage?: Record<string, unknown>;
}

export class AgentLlmAdapter extends LlmProviderPort {
  private readonly endpoint: string;
  private readonly token?: string;
  private readonly fallbackModel: string;

  constructor(config: AppConfig) {
    super();
    if (!config.LLM_BASE_URL) {
      throw new Error('LLM_BASE_URL is required for the agent provider');
    }
    this.endpoint = `${config.LLM_BASE_URL.replace(/\/+$/, '')}/trigger`;
    this.token = config.LLM_API_KEY;
    this.fallbackModel = config.llmModelWithDefault;
  }

  async generateReview(prompt: string, _maxTokens: number): Promise<LlmResponse> {
    const payload = await this.callAgent(prompt);
    const result = payload.result;

    if (!payload.ok || !result || result.is_error || typeof result.result !== 'string') {
      throw new MalformedLlmResponseError(payload.error ?? 'agent returned an error result');
    }

    return {
      content: result.result,
      promptTokens: result.usage?.input_tokens ?? 0,
      completionTokens: result.usage?.output_tokens ?? 0,
      model: this.resolveModel(result.modelUsage),
    };
  }

  private async callAgent(prompt: string): Promise<AgentTriggerResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AGENT_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      const body = (await response.json()) as AgentTriggerResponse;
      if (!response.ok) {
        throw new MalformedLlmResponseError(
          body.error ?? `agent returned status ${response.status}`,
        );
      }
      return body;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LlmTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private resolveModel(modelUsage: Record<string, unknown> | undefined): string {
    const usedModels = modelUsage ? Object.keys(modelUsage) : [];
    return usedModels[0] ?? this.fallbackModel;
  }
}
