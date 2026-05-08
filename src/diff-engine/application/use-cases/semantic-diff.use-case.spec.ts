import { SemanticDiffService } from './semantic-diff.use-case.js';
import { FileProcessorService } from './file-processor.use-case.js';
import { DiffTooLargeError } from '../../domain/errors/diff-engine.errors.js';
import { FileDiff } from '../../domain/entities/file-diff.entity.js';
import { LanguageValue } from '../../domain/value-objects/language.vo.js';
import { AppConfig } from '../../../config/app.config.js';
import type { DiffInput } from '../types/diff-result.types.js';

describe('SemanticDiffService', () => {
  let service: SemanticDiffService;
  let fileProcessor: jest.Mocked<FileProcessorService>;
  let config: AppConfig;

  beforeEach(() => {
    fileProcessor = {
      processFile: jest.fn(),
    } as unknown as jest.Mocked<FileProcessorService>;

    config = { MAX_DIFF_LINES: 100 } as AppConfig;
    service = new SemanticDiffService(fileProcessor, config);
  });

  function makeDiffInput(filenames: string[]): DiffInput {
    return {
      installationId: 'inst-1',
      repositoryId: 'repo-1',
      owner: 'acme',
      repo: 'demo',
      baseSha: 'base',
      headSha: 'head',
      files: filenames.map((filename) => ({
        filename,
        status: 'modified',
        additions: 10,
        deletions: 0,
      })),
    };
  }

  function makeFileDiff(filePath: string, semanticLines: number): FileDiff {
    return new FileDiff({
      filePath,
      language: LanguageValue.TYPESCRIPT,
      hunks: [],
      rawLines: semanticLines,
      semanticLines,
      strategy: 'whitespace',
    });
  }

  it('throws DiffTooLargeError when totalSemanticLines exceeds MAX_DIFF_LINES', async () => {
    fileProcessor.processFile
      .mockResolvedValueOnce(makeFileDiff('a.ts', 80))
      .mockResolvedValueOnce(makeFileDiff('b.ts', 50));

    await expect(service.computeDiff(makeDiffInput(['a.ts', 'b.ts']))).rejects.toBeInstanceOf(
      DiffTooLargeError,
    );
  });

  it('returns the result normally when totalSemanticLines is within the limit', async () => {
    fileProcessor.processFile
      .mockResolvedValueOnce(makeFileDiff('a.ts', 30))
      .mockResolvedValueOnce(makeFileDiff('b.ts', 40));

    const result = await service.computeDiff(makeDiffInput(['a.ts', 'b.ts']));

    expect(result.totalSemanticLines).toBe(70);
    expect(result.files).toHaveLength(2);
  });
});
