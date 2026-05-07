/* eslint-disable @typescript-eslint/unbound-method */
import { ProcessFileDiffUseCase } from './process-file-diff.use-case.js';
import { AstNormalizerPort } from '../../domain/ports/ast-normalizer.port.js';
import { FileContentProviderPort } from '../../domain/ports/file-content-provider.port.js';
import { AppConfig } from '../../../config/app.config.js';
import type { FileInput } from '../types/diff-result.types.js';

describe('ProcessFileDiffUseCase', () => {
  let service: ProcessFileDiffUseCase;
  let normalizer: jest.Mocked<AstNormalizerPort>;
  let fileProvider: jest.Mocked<FileContentProviderPort>;
  let config: AppConfig;

  beforeEach(() => {
    normalizer = {
      normalize: jest.fn().mockImplementation((source: string) => `AST(${source})`),
    };

    fileProvider = {
      getFileContent: jest.fn(),
    };

    config = { MAX_FILE_SIZE_KB: 1 } as AppConfig;
    service = new ProcessFileDiffUseCase(normalizer, fileProvider, config);
  });

  function makeFile(filename: string): FileInput {
    return {
      filename,
      status: 'modified',
      additions: 10,
      deletions: 2,
    };
  }

  describe('MAX_FILE_SIZE_KB enforcement', () => {
    it('skips AST normalization and uses whitespace strategy when file exceeds size limit', async () => {
      // 2 KB of content — well over the 1 KB limit configured above
      const oversizedBase = 'a'.repeat(2048);
      const oversizedHead = 'b'.repeat(2048);
      fileProvider.getFileContent
        .mockResolvedValueOnce(oversizedBase)
        .mockResolvedValueOnce(oversizedHead);

      const fileDiff = await service.processFile(
        makeFile('big.ts'),
        'inst-1',
        'repo-1',
        'acme',
        'demo',
        'base-sha',
        'head-sha',
      );

      expect(normalizer.normalize).not.toHaveBeenCalled();
      expect(fileDiff.strategy).toBe('whitespace');
    });

    it('uses AST normalization when file is within the size limit', async () => {
      const smallBase = 'const x = 1;';
      const smallHead = 'const x = 2;';
      fileProvider.getFileContent.mockResolvedValueOnce(smallBase).mockResolvedValueOnce(smallHead);

      const fileDiff = await service.processFile(
        makeFile('small.ts'),
        'inst-1',
        'repo-1',
        'acme',
        'demo',
        'base-sha',
        'head-sha',
      );

      expect(normalizer.normalize).toHaveBeenCalledTimes(2);
      expect(fileDiff.strategy).toBe('ast');
    });
  });
});
