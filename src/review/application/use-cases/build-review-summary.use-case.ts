import { Injectable } from '@nestjs/common';
import { Severity } from '../../domain/value-objects/severity.vo.js';
import type { ParsedReview } from '../../application/types/review-result.types.js';

interface BuildReviewSummaryInput {
  diff: { totalRawLines: number; totalSemanticLines: number; noiseReductionPct: number };
  parsed: ParsedReview;
  hasGuidelines: boolean;
}

@Injectable()
export class BuildReviewSummaryUseCase {
  execute({ diff, parsed, hasGuidelines }: BuildReviewSummaryInput): string {
    const criticals = parsed.comments.filter((c) => c.severity === Severity.CRITICAL).length;
    const warnings = parsed.comments.filter((c) => c.severity === Severity.WARNING).length;
    const infos = parsed.comments.filter((c) => c.severity === Severity.INFO).length;

    const lines = [
      '## ClearPR Review',
      '',
      `**Diff stats:** ${diff.totalRawLines.toLocaleString()} raw lines → ${diff.totalSemanticLines.toLocaleString()} semantic lines (${diff.noiseReductionPct}% noise filtered)`,
      '',
    ];

    if (parsed.comments.length > 0) {
      lines.push('### Findings');
      if (criticals > 0) lines.push(`- ${criticals} critical`);
      if (warnings > 0) lines.push(`- ${warnings} warning${warnings > 1 ? 's' : ''}`);
      if (infos > 0) lines.push(`- ${infos} info`);
      lines.push('');
    } else {
      lines.push('No issues found.');
      lines.push('');
    }

    if (hasGuidelines) {
      lines.push('> Reviewed against project guidelines.');
    }

    return lines.join('\n');
  }
}
