import { Injectable } from '@nestjs/common';
import * as ts from 'typescript';
import type { LanguageNormalizer } from './language-normalizer.interface.js';

// Output is a canonical byte-equality form for diff comparison, not runnable code.
@Injectable()
export class TypeScriptNormalizer implements LanguageNormalizer {
  normalize(source: string): string {
    try {
      return this.normalizeViaAst(source);
    } catch {
      return this.fallbackNormalize(source);
    }
  }

  private normalizeViaAst(source: string): string {
    const sourceFile = ts.createSourceFile(
      'source.ts',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const sortedSource = this.rewriteImportSpecifiers(sourceFile, source);
    const stripped = this.stripCommentsAndNoise(sortedSource);
    return this.collapseWhitespace(stripped).trim();
  }

  private rewriteImportSpecifiers(sourceFile: ts.SourceFile, source: string): string {
    const replacements: Array<{ start: number; end: number; text: string }> = [];

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && node.importClause?.namedBindings) {
        const bindings = node.importClause.namedBindings;
        if (ts.isNamedImports(bindings) && bindings.elements.length > 1) {
          const sorted = [...bindings.elements]
            .map((element) => element.getText(sourceFile))
            .sort()
            .join(', ');
          replacements.push({
            start: bindings.getStart(sourceFile),
            end: bindings.getEnd(),
            text: `{ ${sorted} }`,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    if (replacements.length === 0) return source;

    replacements.sort((a, b) => b.start - a.start);
    let result = source;
    for (const replacement of replacements) {
      result =
        result.slice(0, replacement.start) + replacement.text + result.slice(replacement.end);
    }
    return result;
  }

  private stripCommentsAndNoise(source: string): string {
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX);
    scanner.setText(source);
    const out: string[] = [];

    while (true) {
      const token = scanner.scan();
      if (token === ts.SyntaxKind.EndOfFileToken) break;

      if (
        token === ts.SyntaxKind.SingleLineCommentTrivia ||
        token === ts.SyntaxKind.MultiLineCommentTrivia
      ) {
        out.push(' ');
        continue;
      }

      const text = scanner.getTokenText();

      if (token === ts.SyntaxKind.StringLiteral) {
        out.push(this.canonicalizeStringLiteral(text));
        continue;
      }

      if (token === ts.SyntaxKind.SemicolonToken) {
        continue;
      }

      out.push(text);
    }

    return out.join('');
  }

  private canonicalizeStringLiteral(literal: string): string {
    if (literal.length < 2) return literal;
    const quote = literal[0];
    if (quote !== '"' && quote !== "'") return literal;
    const inner = literal.slice(1, -1);
    const rebuilt = inner.replace(/\\"/g, '"').replace(/(?<!\\)'/g, "\\'");
    return `'${rebuilt}'`;
  }

  private collapseWhitespace(source: string): string {
    return source
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n(?:[ \t]*\n)+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/,(\s*[}\])])/g, '$1');
  }

  private fallbackNormalize(source: string): string {
    let result = source;
    result = result.replace(/\/\/[^\n]*/g, '');
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    result = result.replace(/(?<!=)"([^"\\]*(?:\\.[^"\\]*)*)"/g, "'$1'");
    result = result.replace(/,(\s*[}\])])/g, '$1');
    result = result.replace(/;(\s*$|\s*\n)/gm, '$1');
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/[ \t]+$/gm, '');
    return result.trim();
  }
}
