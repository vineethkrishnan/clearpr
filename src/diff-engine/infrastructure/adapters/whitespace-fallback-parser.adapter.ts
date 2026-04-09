import { Injectable } from '@nestjs/common';
import { AstParserPort } from '../../domain/ports/ast-parser.port.js';
import { type Language } from '../../domain/value-objects/language.vo.js';

@Injectable()
export class WhitespaceFallbackParserAdapter extends AstParserPort {
  async parse(source: string, _language: Language): Promise<string> {
    // Strip leading/trailing whitespace per line, collapse multiple blank lines
    return source
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  isSupported(_language: Language): boolean {
    // Whitespace fallback supports all languages
    return true;
  }
}
