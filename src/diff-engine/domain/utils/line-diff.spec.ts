import { computeLineDiffHunks } from './line-diff.js';
import { ChangeType } from '../value-objects/diff-hunk.vo.js';

describe('computeLineDiffHunks', () => {
  it('returns no hunks when inputs are equal', () => {
    expect(computeLineDiffHunks('a\nb\nc', 'a\nb\nc')).toEqual([]);
  });

  it('detects a pure addition without polluting trailing context', () => {
    const base = 'a\nb\nc';
    const head = 'a\nx\nb\nc';
    const hunks = computeLineDiffHunks(base, head);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]!.changeType).toBe(ChangeType.ADDED);
    expect(hunks[0]!.startLine).toBe(2);
    expect(hunks[0]!.content).toBe('x');
  });

  it('detects a pure deletion without merging unrelated trailing lines', () => {
    const base = 'a\nx\nb\nc';
    const head = 'a\nb\nc';
    const hunks = computeLineDiffHunks(base, head);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]!.changeType).toBe(ChangeType.REMOVED);
  });

  it('keeps unrelated changes as separate hunks', () => {
    const base = 'a\nb\nc\nd\ne';
    const head = 'a\nB\nc\nd\nE';
    const hunks = computeLineDiffHunks(base, head);
    expect(hunks).toHaveLength(2);
    expect(hunks[0]!.startLine).toBe(2);
    expect(hunks[1]!.startLine).toBe(5);
  });

  it('treats a same-line replacement as MODIFIED', () => {
    const base = 'a\nb\nc';
    const head = 'a\nB\nc';
    const hunks = computeLineDiffHunks(base, head);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]!.changeType).toBe(ChangeType.MODIFIED);
    expect(hunks[0]!.content).toBe('B');
  });

  it('does not return a fake hunk when an early insertion shifts later lines', () => {
    // The naive index-aligned algorithm would mark every line after the
    // insertion as changed; LCS should detect only one real hunk.
    const base = 'a\nb\nc\nd\ne\nf';
    const head = 'a\nINSERTED\nb\nc\nd\ne\nf';
    const hunks = computeLineDiffHunks(base, head);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]!.changeType).toBe(ChangeType.ADDED);
    expect(hunks[0]!.content).toBe('INSERTED');
  });
});
