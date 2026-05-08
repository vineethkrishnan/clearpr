import { Injectable, Logger } from '@nestjs/common';
import { AstNormalizerPort } from '../../domain/ports/ast-normalizer.port.js';
import { FileContentProviderPort } from '../../domain/ports/file-content-provider.port.js';
import { FileDiff, type DiffStrategy } from '../../domain/entities/file-diff.entity.js';
import { Language } from '../../domain/value-objects/language.vo.js';
import type { DiffHunk } from '../../domain/value-objects/diff-hunk.vo.js';
import { computeLineDiffHunks } from '../../domain/utils/line-diff.js';
import type { FileInput } from '../types/diff-result.types.js';
import { AppConfig } from '../../../config/app.config.js';

// Cheap fallback normalization used when a file exceeds MAX_FILE_SIZE_KB.
// Trims trailing whitespace and collapses runs of blank lines so the line-diff
// step is not skewed by pure-whitespace churn, without the cost of AST parsing.
function whitespaceNormalize(source: string): string {
  return source
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

@Injectable()
export class ProcessFileDiffUseCase {
  private readonly logger = new Logger(ProcessFileDiffUseCase.name);

  constructor(
    private readonly normalizer: AstNormalizerPort,
    private readonly fileProvider: FileContentProviderPort,
    private readonly config: AppConfig,
  ) {}

  async processFile(
    file: FileInput,
    installationId: string,
    repositoryId: string,
    owner: string,
    repo: string,
    baseSha: string,
    headSha: string,
    languageOverrides?: Record<string, string>,
  ): Promise<FileDiff> {
    const language = Language.detect(file.filename, languageOverrides);
    const rawLines = file.additions + file.deletions;

    // Handle special cases
    if (file.status === 'removed') {
      return new FileDiff({
        filePath: file.filename,
        language: language.value,
        hunks: [],
        rawLines,
        semanticLines: rawLines,
        strategy: 'identity',
        isDeleted: true,
      });
    }

    if (file.status === 'added') {
      return new FileDiff({
        filePath: file.filename,
        language: language.value,
        hunks: [],
        rawLines,
        semanticLines: rawLines,
        strategy: 'identity',
        isNew: true,
      });
    }

    if (file.status === 'renamed' && file.additions === 0 && file.deletions === 0) {
      return new FileDiff({
        filePath: file.filename,
        language: language.value,
        hunks: [],
        rawLines: 0,
        semanticLines: 0,
        strategy: 'identity',
        isRenamed: true,
        previousPath: file.previousFilename,
      });
    }

    // Fetch file contents
    const [baseContent, headContent] = await Promise.all([
      this.fileProvider.getFileContent(
        repositoryId,
        installationId,
        owner,
        repo,
        baseSha,
        file.previousFilename ?? file.filename,
      ),
      this.fileProvider.getFileContent(
        repositoryId,
        installationId,
        owner,
        repo,
        headSha,
        file.filename,
      ),
    ]);

    if (!baseContent || !headContent) {
      return new FileDiff({
        filePath: file.filename,
        language: language.value,
        hunks: [],
        rawLines,
        semanticLines: rawLines,
        strategy: 'identity',
        isNew: !baseContent,
        isDeleted: !headContent,
      });
    }

    // Check file size limit. When a file blows past MAX_FILE_SIZE_KB we skip
    // the AST normalizer (which can be O(n) memory-heavy for huge sources) and
    // fall back to the cheap whitespace strategy to bound CPU/memory cost.
    const fileSizeKb = Math.max(baseContent.length, headContent.length) / 1024;
    const isOversized = fileSizeKb > this.config.MAX_FILE_SIZE_KB;
    if (isOversized) {
      this.logger.warn(
        { filePath: file.filename, sizeKb: Math.round(fileSizeKb) },
        'File exceeds size limit — using whitespace fallback',
      );
    }

    // Normalize both versions
    const strategy: DiffStrategy = !isOversized && language.isSupported ? 'ast' : 'whitespace';
    const normalizedBase = isOversized
      ? whitespaceNormalize(baseContent)
      : this.normalizer.normalize(baseContent, language);
    const normalizedHead = isOversized
      ? whitespaceNormalize(headContent)
      : this.normalizer.normalize(headContent, language);

    // Compare normalized versions
    if (normalizedBase === normalizedHead) {
      return new FileDiff({
        filePath: file.filename,
        language: language.value,
        hunks: [],
        rawLines,
        semanticLines: 0,
        strategy,
        isRenamed: file.status === 'renamed',
        previousPath: file.previousFilename,
      });
    }

    // Compute semantic diff hunks
    const hunks = this.computeHunks(normalizedBase, normalizedHead);
    const semanticLines = hunks.reduce((sum, h) => sum + (h.endLine - h.startLine + 1), 0);

    return new FileDiff({
      filePath: file.filename,
      language: language.value,
      hunks,
      rawLines,
      semanticLines,
      strategy,
      isRenamed: file.status === 'renamed',
      previousPath: file.previousFilename,
    });
  }

  private computeHunks(base: string, head: string): DiffHunk[] {
    return computeLineDiffHunks(base, head);
  }
}
