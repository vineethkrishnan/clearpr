import { Injectable } from '@nestjs/common';
import type { LanguageNormalizer } from './language-normalizer.interface.js';

@Injectable()
export class PhpNormalizer implements LanguageNormalizer {
  normalize(source: string): string {
    let result = source;

    // Normalize single-quoted strings where safe (non-interpolated)
    result = result.replace(/"([^"$\\]*(?:\\.[^"$\\]*)*)"/g, "'$1'");

    // Remove trailing commas
    result = result.replace(/,(\s*[)\]])/g, '$1');

    // Normalize whitespace
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/[ \t]+$/gm, '');

    // Sort use statements
    const useLines: string[] = [];
    result = result.replace(/^use\s+[^;]+;$/gm, (match) => {
      useLines.push(match);
      return '___USE_PLACEHOLDER___';
    });
    useLines.sort();
    let useIndex = 0;
    result = result.replace(/___USE_PLACEHOLDER___/g, () => useLines[useIndex++] ?? '');

    return result.trim();
  }
}
