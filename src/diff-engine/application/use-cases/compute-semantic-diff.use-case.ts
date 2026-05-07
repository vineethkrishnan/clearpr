import { Injectable, Logger } from '@nestjs/common';
import { ProcessFileDiffUseCase } from './process-file-diff.use-case.js';
import { calculateNoiseReductionPct } from '../../domain/utils/noise-reduction.js';
import { DiffTooLargeError } from '../../domain/errors/diff-engine.errors.js';
import type { DiffInput, SemanticDiffResult } from '../types/diff-result.types.js';
import { AppConfig } from '../../../config/app.config.js';

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webp',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.pdf',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
]);

@Injectable()
export class ComputeSemanticDiffUseCase {
  private readonly logger = new Logger(ComputeSemanticDiffUseCase.name);

  constructor(
    private readonly fileProcessor: ProcessFileDiffUseCase,
    private readonly config: AppConfig,
  ) {}

  async computeDiff(input: DiffInput): Promise<SemanticDiffResult> {
    const skippedFiles: string[] = [];
    const processableFiles = input.files.filter((file) => {
      const ext = file.filename.slice(file.filename.lastIndexOf('.'));
      if (BINARY_EXTENSIONS.has(ext)) {
        skippedFiles.push(file.filename);
        return false;
      }
      return true;
    });

    // Process files with concurrency limit
    const concurrency = 4;
    const results = [];
    for (let i = 0; i < processableFiles.length; i += concurrency) {
      const batch = processableFiles.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((file) =>
          this.fileProcessor.processFile(
            file,
            input.installationId,
            input.repositoryId,
            input.owner,
            input.repo,
            input.baseSha,
            input.headSha,
            input.languageOverrides,
          ),
        ),
      );
      results.push(...batchResults);
    }

    const totalRawLines = results.reduce((sum, f) => sum + f.rawLines, 0);
    const totalSemanticLines = results.reduce((sum, f) => sum + f.semanticLines, 0);
    const noiseReductionPct = calculateNoiseReductionPct(totalRawLines, totalSemanticLines);

    this.logger.log(
      {
        totalFiles: results.length,
        totalRawLines,
        totalSemanticLines,
        noiseReductionPct,
        skippedBinary: skippedFiles.length,
      },
      `Semantic diff computed: ${totalRawLines} raw → ${totalSemanticLines} semantic (${noiseReductionPct}% noise removed)`,
    );

    // Enforce diff-size budget here so the diff engine owns the policy. Callers
    // catch this error and translate it into their own skip handling.
    if (totalSemanticLines > this.config.MAX_DIFF_LINES) {
      throw new DiffTooLargeError(totalSemanticLines, this.config.MAX_DIFF_LINES);
    }

    return {
      files: results,
      totalRawLines,
      totalSemanticLines,
      noiseReductionPct,
      skippedFiles,
    };
  }
}
