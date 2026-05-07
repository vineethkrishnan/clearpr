import { Injectable } from '@nestjs/common';
import type { LanguageNormalizer } from './language-normalizer.interface.js';

@Injectable()
export class JsonNormalizer implements LanguageNormalizer {
  normalize(source: string): string {
    try {
      const parsed: unknown = JSON.parse(source);
      return JSON.stringify(this.sortKeysDeep(parsed));
    } catch {
      return source.trim();
    }
  }

  private sortKeysDeep(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((entry) => this.sortKeysDeep(entry));
    if (value === null || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = this.sortKeysDeep(record[key]);
    }
    return sorted;
  }
}
