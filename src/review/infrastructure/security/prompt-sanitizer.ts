import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PromptSanitizer {
  private readonly logger = new Logger(PromptSanitizer.name);

  sanitize(input: string, maxLength: number): string {
    let sanitized = input.slice(0, maxLength);

    const patterns = [
      /ignore\s+(previous|above|all)\s+instructions/gi,
      /system\s*:/gi,
      /<\/?system>/gi,
      /you\s+are\s+now/gi,
      /new\s+instructions?\s*:/gi,
    ];

    for (const pattern of patterns) {
      if (pattern.test(sanitized)) {
        this.logger.warn(
          { audit: true, event: 'prompt_injection_sanitized', pattern: pattern.source },
          'Prompt injection pattern detected and sanitized',
        );
        sanitized = sanitized.replace(pattern, '[filtered]');
      }
    }

    return sanitized;
  }
}
