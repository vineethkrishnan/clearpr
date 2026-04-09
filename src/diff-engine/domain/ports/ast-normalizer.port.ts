import { type Language } from '../value-objects/language.vo.js';

export abstract class AstNormalizerPort {
  abstract normalize(source: string, language: Language): string;
}
