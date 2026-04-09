import { Injectable } from '@nestjs/common';
import { PromptSanitizer } from './prompt-sanitizer.service.js';
import { type SemanticDiffResult } from '../../../diff-engine/application/types/diff-result.types.js';
import { calculateTokenBudget } from '../../domain/value-objects/token-budget.vo.js';

@Injectable()
export class PromptBuilderService {
  constructor(private readonly sanitizer: PromptSanitizer) {}

  build(params: {
    diff: SemanticDiffResult;
    guidelines: string | null;
    memoryContext: string | null;
    prTitle?: string;
    prBody?: string;
  }): string {
    const budget = calculateTokenBudget();

    const systemPrompt = `You are a code reviewer. Review the following semantic diff against the project guidelines provided. Only comment on meaningful issues — not style preferences already handled by formatters.

Respond with valid JSON in this exact format:
{
  "comments": [
    { "path": "file.ts", "line": 42, "side": "RIGHT", "severity": "warning", "body": "description" }
  ],
  "summary": "markdown summary of findings"
}

Severity levels: "critical" (security/data loss), "warning" (bugs/logic errors), "info" (suggestions).`;

    const parts: string[] = [systemPrompt];

    if (params.guidelines) {
      const truncatedGuidelines = params.guidelines.slice(0, budget.guidelines * 4);
      parts.push(`<project-guidelines>\n${truncatedGuidelines}\n</project-guidelines>`);
    }

    if (params.memoryContext) {
      const truncatedMemory = params.memoryContext.slice(0, budget.memory * 4);
      parts.push(`<past-feedback>\n${truncatedMemory}\n</past-feedback>`);
    }

    if (params.prTitle || params.prBody) {
      const title = this.sanitizer.sanitize(params.prTitle ?? '', 200);
      const body = this.sanitizer.sanitize(params.prBody ?? '', 5000);
      parts.push(
        `<user-provided-context>\nPR Title: ${title}\nPR Description: ${body}\n</user-provided-context>`,
      );
    }

    // Build diff section
    const diffContent = params.diff.files
      .filter((f) => f.semanticLines > 0)
      .map((f) => {
        const hunksText = f.hunks.map((h) => h.content).join('\n---\n');
        return `### ${f.filePath} (${f.strategy}, ${f.semanticLines} lines)\n${hunksText}`;
      })
      .join('\n\n');

    parts.push(`<semantic-diff>\n${diffContent}\n</semantic-diff>`);

    return parts.join('\n\n');
  }
}
