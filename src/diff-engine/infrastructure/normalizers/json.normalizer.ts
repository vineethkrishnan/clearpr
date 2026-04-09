import { Injectable } from '@nestjs/common';
import type { LanguageNormalizer } from './language-normalizer.interface.js';

@Injectable()
export class JsonNormalizer implements LanguageNormalizer {
  normalize(source: string): string {
    try {
      const parsed: unknown = JSON.parse(source);
      const isPlainObject = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
      const sortedKeys = isPlainObject ? Object.keys(parsed).sort() : undefined;
      return JSON.stringify(parsed, sortedKeys, 0);
    } catch {
      return source.trim();
    }
  }
}
