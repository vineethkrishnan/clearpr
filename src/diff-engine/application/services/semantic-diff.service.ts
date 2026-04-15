import { Injectable, Logger } from '@nestjs/common';
import { FileProcessorService } from './file-processor.service.js';
import { calculateNoiseReductionPct } from '../../domain/utils/noise-reduction.js';
import type { DiffInput, SemanticDiffResult } from '../types/diff-result.types.js';

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
export class SemanticDiffService {
  private readonly logger = new Logger(SemanticDiffService.name);

  constructor(private readonly fileProcessor: FileProcessorService) {}

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

    return {
      files: results,
      totalRawLines,
      totalSemanticLines,
      noiseReductionPct,
      skippedFiles,
    };
  }
}
