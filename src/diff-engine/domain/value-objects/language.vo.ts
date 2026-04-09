import { ValueObject } from '../../../shared/domain/value-object.base.js';

export enum LanguageValue {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PHP = 'php',
  JSON = 'json',
  YAML = 'yaml',
  UNKNOWN = 'unknown',
}

interface LanguageProps {
  value: LanguageValue;
}

const EXTENSION_MAP: Record<string, LanguageValue> = {
  '.ts': LanguageValue.TYPESCRIPT,
  '.tsx': LanguageValue.TYPESCRIPT,
  '.js': LanguageValue.JAVASCRIPT,
  '.jsx': LanguageValue.JAVASCRIPT,
  '.mjs': LanguageValue.JAVASCRIPT,
  '.cjs': LanguageValue.JAVASCRIPT,
  '.php': LanguageValue.PHP,
  '.json': LanguageValue.JSON,
  '.yml': LanguageValue.YAML,
  '.yaml': LanguageValue.YAML,
};

export class Language extends ValueObject<LanguageProps> {
  private constructor(props: LanguageProps) {
    super(props);
  }

  static detect(filePath: string, overrides?: Record<string, string>): Language {
    if (overrides) {
      for (const [pattern, lang] of Object.entries(overrides)) {
        if (filePath.endsWith(pattern.replace('*', ''))) {
          const value = Object.values(LanguageValue).find((v) => v === lang);
          if (value) return new Language({ value });
        }
      }
    }

    const ext = filePath.slice(filePath.lastIndexOf('.'));
    const value = EXTENSION_MAP[ext] ?? LanguageValue.UNKNOWN;
    return new Language({ value });
  }

  static from(value: LanguageValue): Language {
    return new Language({ value });
  }

  get value(): LanguageValue {
    return this.props.value;
  }

  get isSupported(): boolean {
    return this.props.value !== LanguageValue.UNKNOWN;
  }
}
