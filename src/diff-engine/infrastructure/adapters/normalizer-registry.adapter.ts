import { Injectable } from '@nestjs/common';
import { AstNormalizerPort } from '../../domain/ports/ast-normalizer.port.js';
import { type Language, LanguageValue } from '../../domain/value-objects/language.vo.js';
import type { LanguageNormalizer } from '../normalizers/language-normalizer.interface.js';
import { TypeScriptNormalizer } from '../normalizers/typescript.normalizer.js';
import { PhpNormalizer } from '../normalizers/php.normalizer.js';
import { JsonNormalizer } from '../normalizers/json.normalizer.js';
import { YamlNormalizer } from '../normalizers/yaml.normalizer.js';

@Injectable()
export class NormalizerRegistryAdapter extends AstNormalizerPort {
  private readonly normalizers: Map<LanguageValue, LanguageNormalizer>;

  constructor(
    ts: TypeScriptNormalizer,
    php: PhpNormalizer,
    json: JsonNormalizer,
    yaml: YamlNormalizer,
  ) {
    super();
    this.normalizers = new Map([
      [LanguageValue.TYPESCRIPT, ts],
      [LanguageValue.JAVASCRIPT, ts],
      [LanguageValue.PHP, php],
      [LanguageValue.JSON, json],
      [LanguageValue.YAML, yaml],
    ]);
  }

  normalize(source: string, language: Language): string {
    const normalizer = this.normalizers.get(language.value);
    if (!normalizer) return source;
    return normalizer.normalize(source);
  }
}
