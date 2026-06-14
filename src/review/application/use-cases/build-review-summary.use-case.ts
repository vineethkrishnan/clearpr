import { Injectable } from '@nestjs/common';
import { Severity } from '../../domain/value-objects/severity.vo.js';
import type {
  ParsedReview,
  ParsedReviewComment,
} from '../../application/types/review-result.types.js';

interface BuildReviewSummaryInput {
  diff: { totalRawLines: number; totalSemanticLines: number; noiseReductionPct: number };
  parsed: ParsedReview;
  hasGuidelines: boolean;
  // False when inline comments could not be anchored to the diff; the findings
  // are then listed in the summary so they are not lost.
  inlineAnchored?: boolean;
}

@Injectable()
export class BuildReviewSummaryUseCase {
  execute({ diff, parsed, hasGuidelines, inlineAnchored = true }: BuildReviewSummaryInput): string {
    const lines = [
      '## ClearPR Review',
      '',
      `**Diff stats:** ${diff.totalRawLines.toLocaleString()} raw lines → ${diff.totalSemanticLines.toLocaleString()} semantic lines (${diff.noiseReductionPct}% noise filtered)`,
      '',
    ];

    if (parsed.comments.length > 0) {
      lines.push(...this.renderFindings(parsed.comments, inlineAnchored));
    } else {
      lines.push('No issues found.', '');
    }

    if (hasGuidelines) {
      lines.push('> Reviewed against project guidelines.');
    }

    return lines.join('\n');
  }

  private renderFindings(comments: ParsedReviewComment[], inlineAnchored: boolean): string[] {
    const criticals = comments.filter((c) => c.severity === Severity.CRITICAL).length;
    const warnings = comments.filter((c) => c.severity === Severity.WARNING).length;
    const infos = comments.filter((c) => c.severity === Severity.INFO).length;

    const lines = ['### Findings'];
    if (criticals > 0) lines.push(`- ${criticals} critical`);
    if (warnings > 0) lines.push(`- ${warnings} warning${warnings > 1 ? 's' : ''}`);
    if (infos > 0) lines.push(`- ${infos} info`);
    lines.push('');

    if (!inlineAnchored) {
      lines.push(
        '> Inline comments could not be anchored to the diff (e.g. an unsupported language), so the findings are listed here:',
        '',
      );
      for (const comment of comments) {
        lines.push(
          `- **[${comment.severity}]** \`${comment.path}:${comment.line}\` ${comment.body}`,
        );
      }
      lines.push('');
    }

    return lines;
  }
}
