import { type Language } from '../value-objects/language.vo.js';

export abstract class AstParserPort {
  abstract parse(source: string, language: Language): Promise<string>;
  abstract isSupported(language: Language): boolean;
}
