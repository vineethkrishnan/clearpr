import { Injectable } from '@nestjs/common';
import type { LanguageNormalizer } from './language-normalizer.interface.js';

@Injectable()
export class JsonNormalizer implements LanguageNormalizer {
  normalize(source: string): string {
    try {
      const parsed: unknown = JSON.parse(source);
      return JSON.stringify(parsed, Object.keys(parsed as object).sort(), 0);
    } catch {
      // If JSON is invalid, return trimmed source
      return source.trim();
    }
  }
}
