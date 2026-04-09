import { Injectable, Logger } from '@nestjs/common';
import { AstNormalizerPort } from '../../domain/ports/ast-normalizer.port.js';
import { FileContentProviderPort } from '../../domain/ports/file-content-provider.port.js';
import { FileDiff, type DiffStrategy } from '../../domain/entities/file-diff.entity.js';
import { Language } from '../../domain/value-objects/language.vo.js';
import { ChangeType, type DiffHunk } from '../../domain/value-objects/diff-hunk.vo.js';
import type { FileInput } from '../types/diff-result.types.js';
import { AppConfig } from '../../../config/app.config.js';

@Injectable()
export class FileProcessorService {
  private readonly logger = new Logger(FileProcessorService.name);

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
      this.fileProvider.getFileContent(repositoryId, installationId, owner, repo, baseSha, file.previousFilename ?? file.filename),
      this.fileProvider.getFileContent(repositoryId, installationId, owner, repo, headSha, file.filename),
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

    // Check file size limit
    const fileSizeKb = Math.max(baseContent.length, headContent.length) / 1024;
    if (fileSizeKb > this.config.MAX_FILE_SIZE_KB) {
      this.logger.warn(
        { filePath: file.filename, sizeKb: Math.round(fileSizeKb) },
        'File exceeds size limit — using whitespace fallback',
      );
    }

    // Normalize both versions
    let strategy: DiffStrategy = language.isSupported ? 'ast' : 'whitespace';
    const normalizedBase = this.normalizer.normalize(baseContent, language);
    const normalizedHead = this.normalizer.normalize(headContent, language);

    if (!language.isSupported) {
      strategy = 'whitespace';
    }

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
    const semanticLines = hunks.reduce(
      (sum, h) => sum + (h.endLine - h.startLine + 1),
      0,
    );

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
    const baseLines = base.split('\n');
    const headLines = head.split('\n');
    const hunks: DiffHunk[] = [];
    const maxLen = Math.max(baseLines.length, headLines.length);

    let hunkStart = -1;
    let hunkContent: string[] = [];

    for (let i = 0; i < maxLen; i++) {
      const baseLine = baseLines[i];
      const headLine = headLines[i];

      if (baseLine !== headLine) {
        if (hunkStart === -1) hunkStart = i + 1;
        hunkContent.push(headLine ?? '');
      } else if (hunkStart !== -1) {
        hunks.push({
          startLine: hunkStart,
          endLine: hunkStart + hunkContent.length - 1,
          content: hunkContent.join('\n'),
          changeType: ChangeType.MODIFIED,
        });
        hunkStart = -1;
        hunkContent = [];
      }
    }

    if (hunkStart !== -1) {
      hunks.push({
        startLine: hunkStart,
        endLine: hunkStart + hunkContent.length - 1,
        content: hunkContent.join('\n'),
        changeType: ChangeType.MODIFIED,
      });
    }

    return hunks;
  }
}
