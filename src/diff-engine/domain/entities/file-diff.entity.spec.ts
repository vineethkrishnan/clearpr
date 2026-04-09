import { FileDiff } from './file-diff.entity.js';
import { LanguageValue } from '../value-objects/language.vo.js';

describe('FileDiff', () => {
  it('should calculate noise reduction percentage', () => {
    const diff = new FileDiff({
      filePath: 'test.ts',
      language: LanguageValue.TYPESCRIPT,
      hunks: [],
      rawLines: 1000,
      semanticLines: 50,
      strategy: 'ast',
    });
    expect(diff.noiseReductionPct).toBe(95);
  });

  it('should return 0% noise reduction when rawLines is 0', () => {
    const diff = new FileDiff({
      filePath: 'test.ts',
      language: LanguageValue.TYPESCRIPT,
      hunks: [],
      rawLines: 0,
      semanticLines: 0,
      strategy: 'identity',
    });
    expect(diff.noiseReductionPct).toBe(0);
  });

  it('should track new/deleted/renamed status', () => {
    const newFile = new FileDiff({
      filePath: 'new.ts',
      language: LanguageValue.TYPESCRIPT,
      hunks: [],
      rawLines: 10,
      semanticLines: 10,
      strategy: 'identity',
      isNew: true,
    });
    expect(newFile.isNew).toBe(true);
    expect(newFile.isDeleted).toBe(false);
  });
});
