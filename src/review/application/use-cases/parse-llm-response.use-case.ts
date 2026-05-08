import { Injectable } from '@nestjs/common';
import { Severity } from '../../domain/value-objects/severity.vo.js';
import { MalformedLlmResponseError } from '../../domain/errors/review.errors.js';
import type {
  ParsedReview,
  ParsedReviewComment,
} from '../../application/types/review-result.types.js';

@Injectable()
export class ParseLlmResponseUseCase {
  execute(content: string): ParsedReview {
    try {
      // Extract JSON from response (may have markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]) as {
        comments?: Array<{
          path?: string;
          line?: number;
          side?: string;
          severity?: string;
          body?: string;
        }>;
        summary?: string;
      };

      const comments: ParsedReviewComment[] = (parsed.comments ?? [])
        .filter(
          (c): c is { path: string; line: number; severity: string; body: string; side?: string } =>
            typeof c.path === 'string' &&
            typeof c.line === 'number' &&
            typeof c.severity === 'string' &&
            typeof c.body === 'string',
        )
        .map((c) => ({
          path: c.path,
          line: c.line,
          side: c.side === 'LEFT' ? 'LEFT' : 'RIGHT',
          severity: (Object.values(Severity).includes(c.severity as Severity)
            ? c.severity
            : Severity.INFO) as Severity,
          body: c.body,
        }));

      return {
        comments,
        summary: parsed.summary ?? 'No summary provided.',
      };
    } catch (error) {
      throw new MalformedLlmResponseError(
        error instanceof Error ? error.message : 'Unknown parse error',
      );
    }
  }
}
