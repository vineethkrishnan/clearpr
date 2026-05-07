import { ChangeType, type DiffHunk } from '../value-objects/diff-hunk.vo.js';

// Hunks are 1-based on head-side line numbers; pure deletions anchor at the
// head line where the deletion would land.
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
    // Tie -> prefer remove so substitutions anchor at the head-side line.
    if (j > 0 && (i === 0 || left > up)) {
      ops.push({ kind: 'add', headLine: j, text: head[j - 1]! });
      j--;
    } else {
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
      if (active.lines.length === 0) {
        active.lines.push('');
      }
    }
  }
  flush();
  return hunks;
}
