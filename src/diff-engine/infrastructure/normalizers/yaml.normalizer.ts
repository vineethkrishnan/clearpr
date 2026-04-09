import { Injectable } from '@nestjs/common';
import yaml from 'js-yaml';
import type { LanguageNormalizer } from './language-normalizer.interface.js';

@Injectable()
export class YamlNormalizer implements LanguageNormalizer {
  normalize(source: string): string {
    try {
      const parsed = yaml.load(source);
      return yaml.dump(parsed, { sortKeys: true, lineWidth: -1 });
    } catch {
      return source.trim();
    }
  }
}
