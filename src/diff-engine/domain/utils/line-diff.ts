import { ChangeType, type DiffHunk } from '../value-objects/diff-hunk.vo.js';

/**
 * Compute hunks describing how `head` differs from `base`, using LCS so that
 * insertions and deletions don't shift everything that follows them into a
 * single mega-hunk. Hunks are anchored to head-side line numbers (1-based);
 * pure deletions take the line position where the deletion would land.
 */
export function computeLineDiffHunks(base: string, head: string): DiffHunk[] {
  const baseLines = splitLines(base);
  const headLines = splitLines(head);

  if (baseLines.length === 0 && headLines.length === 0) return [];

  const lcs = buildLcsTable(baseLines, headLines);
  const ops = walkBack(lcs, baseLines, headLines);

  return collapseToHunks(ops);
}

type Op =
  | { kind: 'equal'; headLine: number; baseLine: number; text: string }
  | { kind: 'add'; headLine: number; text: string }
  | { kind: 'remove'; headLine: number; text: string };

function splitLines(source: string): string[] {
  if (source.length === 0) return [];
  return source.split('\n');
}

function buildLcsTable(base: string[], head: string[]): Uint32Array[] {
  const rows = base.length + 1;
  const cols = head.length + 1;
  const table: Uint32Array[] = Array.from({ length: rows }, () => new Uint32Array(cols));

  for (let i = 1; i < rows; i++) {
    const row = table[i]!;
    const prevRow = table[i - 1]!;
    for (let j = 1; j < cols; j++) {
      if (base[i - 1] === head[j - 1]) {
        row[j] = prevRow[j - 1]! + 1;
      } else {
        const up = prevRow[j]!;
        const left = row[j - 1]!;
        row[j] = up >= left ? up : left;
      }
    }
  }
  return table;
}

function walkBack(table: Uint32Array[], base: string[], head: string[]): Op[] {
  const ops: Op[] = [];
  let i = base.length;
  let j = head.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && base[i - 1] === head[j - 1]) {
      ops.push({ kind: 'equal', headLine: j, baseLine: i, text: head[j - 1]! });
      i--;
      j--;
      continue;
    }
    const up = i > 0 ? table[i - 1]![j]! : -1;
    const left = j > 0 ? table[i]![j - 1]! : -1;
    // Prefer remove on a tie: this anchors substitutions (remove + add) at
    // the head-side line of the new content, matching unified-diff intuition
    // and keeping startLine on the line a reader sees in the new file.
    if (j > 0 && (i === 0 || left > up)) {
      ops.push({ kind: 'add', headLine: j, text: head[j - 1]! });
      j--;
    } else {
      // For removals, the conceptual head anchor is the line position where
      // the deleted text used to sit relative to the new file. j+1 puts the
      // hunk on the line that follows the deletion in head-space, but when
      // a remove comes immediately before an add at the same logical spot
      // we want them to share startLine, so we use j (current head index).
      ops.push({ kind: 'remove', headLine: Math.max(j, 1), text: base[i - 1]! });
      i--;
    }
  }

  return ops.reverse();
}

function collapseToHunks(ops: Op[]): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let active: { startLine: number; lines: string[]; hasAdd: boolean; hasRemove: boolean } | null =
    null;

  const flush = (): void => {
    if (!active) return;
    const changeType: ChangeType =
      active.hasAdd && active.hasRemove
        ? ChangeType.MODIFIED
        : active.hasAdd
          ? ChangeType.ADDED
          : ChangeType.REMOVED;
    const startLine = active.startLine;
    const endLine = startLine + Math.max(active.lines.length - 1, 0);
    hunks.push({
      startLine,
      endLine,
      content: active.lines.join('\n'),
      changeType,
    });
    active = null;
  };

  for (const op of ops) {
    if (op.kind === 'equal') {
      flush();
      continue;
    }
    if (!active) {
      active = {
        startLine: Math.max(op.headLine, 1),
        lines: [],
        hasAdd: false,
        hasRemove: false,
      };
    }
    if (op.kind === 'add') {
      active.lines.push(op.text);
      active.hasAdd = true;
    } else {
      active.hasRemove = true;
      // For pure deletions we still want to record the surrounding context
      // line counts; capturing the removed text gives the LLM something to
      // anchor on without inflating semantic line totals.
      if (active.lines.length === 0) {
        active.lines.push('');
      }
    }
  }
  flush();
  return hunks;
}
