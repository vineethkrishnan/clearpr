import { Injectable } from '@nestjs/common';
import type { LanguageNormalizer } from './language-normalizer.interface.js';

// Coarse string/comment/code tokenizer so quote rewriting never touches
// the inside of strings.
@Injectable()
export class PhpNormalizer implements LanguageNormalizer {
  normalize(source: string): string {
    const segments = this.tokenize(source);
    const rewritten = segments
      .map((segment) => {
        if (segment.kind === 'comment') return ' ';
        if (segment.kind === 'string') return this.canonicalizeString(segment.text);
        return this.normalizeCodeRegion(segment.text);
      })
      .join('');

    const sortedUses = this.sortUseStatements(rewritten);
    return this.collapseWhitespace(sortedUses).trim();
  }

  private tokenize(source: string): Array<{ kind: 'code' | 'string' | 'comment'; text: string }> {
    const segments: Array<{ kind: 'code' | 'string' | 'comment'; text: string }> = [];
    let buffer = '';
    let i = 0;

    const flushCode = (): void => {
      if (buffer.length > 0) {
        segments.push({ kind: 'code', text: buffer });
        buffer = '';
      }
    };

    while (i < source.length) {
      const ch = source[i]!;
      const next = source[i + 1];

      if (ch === '/' && next === '/') {
        flushCode();
        const newlineIdx = source.indexOf('\n', i);
        const end = newlineIdx === -1 ? source.length : newlineIdx;
        segments.push({ kind: 'comment', text: source.slice(i, end) });
        i = end;
        continue;
      }
      if (ch === '#' && next !== '[') {
        flushCode();
        const newlineIdx = source.indexOf('\n', i);
        const end = newlineIdx === -1 ? source.length : newlineIdx;
        segments.push({ kind: 'comment', text: source.slice(i, end) });
        i = end;
        continue;
      }
      if (ch === '/' && next === '*') {
        flushCode();
        const closeIdx = source.indexOf('*/', i + 2);
        const end = closeIdx === -1 ? source.length : closeIdx + 2;
        segments.push({ kind: 'comment', text: source.slice(i, end) });
        i = end;
        continue;
      }
      if (ch === '"' || ch === "'") {
        flushCode();
        const end = this.findStringEnd(source, i, ch);
        segments.push({ kind: 'string', text: source.slice(i, end) });
        i = end;
        continue;
      }
      buffer += ch;
      i++;
    }

    flushCode();
    return segments;
  }

  private findStringEnd(source: string, start: number, quote: string): number {
    let i = start + 1;
    while (i < source.length) {
      const ch = source[i];
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === quote) return i + 1;
      i++;
    }
    return source.length;
  }

  // Only rewrite double quotes when the string can't interpolate; PHP's
  // interpolation semantics differ between quote styles.
  private canonicalizeString(literal: string): string {
    if (literal.length < 2) return literal;
    const quote = literal[0];
    if (quote !== '"') return literal;
    const inner = literal.slice(1, -1);
    if (inner.includes('$') || inner.includes('\\') || inner.includes("'")) return literal;
    return `'${inner}'`;
  }

  private normalizeCodeRegion(code: string): string {
    return code.replace(/,(\s*[)\]])/g, '$1');
  }

  private sortUseStatements(source: string): string {
    const useLines: string[] = [];
    const placeheld = source.replace(/^use\s+[^;]+;$/gm, (match) => {
      useLines.push(match);
      return '___USE_PLACEHOLDER___';
    });
    useLines.sort();
    let useIndex = 0;
    return placeheld.replace(/___USE_PLACEHOLDER___/g, () => useLines[useIndex++] ?? '');
  }

  private collapseWhitespace(source: string): string {
    return source.replace(/[ \t]+\n/g, '\n').replace(/\n(?:[ \t]*\n)+/g, '\n');
  }
}
