import { Injectable } from '@nestjs/common';
import type { LanguageNormalizer } from './language-normalizer.interface.js';

@Injectable()
export class TypeScriptNormalizer implements LanguageNormalizer {
  normalize(source: string): string {
    let result = source;

    // Normalize quote style — convert double quotes to single
    result = result.replace(/(?<!=)"([^"\\]*(?:\\.[^"\\]*)*)"/g, "'$1'");

    // Remove trailing commas
    result = result.replace(/,(\s*[}\])])/g, '$1');

    // Remove semicolons at end of statements
    result = result.replace(/;(\s*$|\s*\n)/gm, '$1');

    // Normalize whitespace — collapse multiple blank lines
    result = result.replace(/\n{3,}/g, '\n\n');

    // Trim trailing whitespace per line
    result = result.replace(/[ \t]+$/gm, '');

    // Sort import specifiers (e.g., { b, a } → { a, b })
    result = result.replace(/import\s*\{([^}]+)\}\s*from/g, (_match, specifiers: string) => {
      const sorted = specifiers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .sort()
        .join(', ');
      return `import { ${sorted} } from`;
    });

    return result.trim();
  }
}
