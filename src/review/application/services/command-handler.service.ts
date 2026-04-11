import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../config/app.config.js';
import { GitHubClientService } from '../../../github/application/services/github-client.service.js';
import { SemanticDiffService } from '../../../diff-engine/application/services/semantic-diff.service.js';
import { PrFileListProviderPort } from '../../domain/ports/pr-file-list-provider.port.js';
import { GuidelineLoaderService } from './guideline-loader.service.js';
import { IgnoreListService } from './ignore-list.service.js';
import { ReviewOrchestratorService } from './review-orchestrator.service.js';
import { matchesAnyPattern } from './glob-match.util.js';
import type { ReviewContext } from '../../domain/types/review-context.types.js';
import type { CommandJobPayload } from '../../../queue/types/job-payload.types.js';
import type { FileDiff } from '../../../diff-engine/domain/entities/file-diff.entity.js';

@Injectable()
export class CommandHandlerService {
  private readonly logger = new Logger(CommandHandlerService.name);

  constructor(
    private readonly githubClient: GitHubClientService,
    private readonly diffService: SemanticDiffService,
    private readonly prFileListProvider: PrFileListProviderPort,
    private readonly guidelineLoader: GuidelineLoaderService,
    private readonly ignoreList: IgnoreListService,
    private readonly orchestrator: ReviewOrchestratorService,
    private readonly config: AppConfig,
  ) {}

  async handle(payload: CommandJobPayload): Promise<void> {
    switch (payload.command) {
      case 'review':
        return this.handleReview(payload);
      case 'diff':
        return this.handleDiff(payload);
      case 'ignore':
        return this.handleIgnore(payload);
      case 'config':
        return this.handleConfig(payload);
    }
  }

  private async handleReview(payload: CommandJobPayload): Promise<void> {
    const context = await this.buildContext(payload);
    if (!context) return;

    this.logger.log(
      { prNumber: payload.prNumber, correlationId: payload.correlationId },
      'Running manual review via @clearpr review',
    );

    await this.orchestrator.execute(context, 'manual');
  }

  private async handleDiff(payload: CommandJobPayload): Promise<void> {
    const context = await this.buildContext(payload);
    if (!context) return;

    const prFiles = await this.prFileListProvider.getPrFiles(
      context.installationId,
      context.owner,
      context.repo,
      context.prNumber,
    );

    const ignored = await this.ignoreList.getPatterns(context.repositoryId, context.prNumber);
    const filtered =
      ignored.length > 0 ? prFiles.filter((f) => !matchesAnyPattern(f.filename, ignored)) : prFiles;

    const diffResult = await this.diffService.computeDiff({
      installationId: context.installationId,
      repositoryId: context.repositoryId,
      owner: context.owner,
      repo: context.repo,
      baseSha: context.baseBranch,
      headSha: context.prSha,
      files: filtered,
    });

    const body = this.formatDiffComment(
      diffResult.files,
      diffResult.totalRawLines,
      diffResult.totalSemanticLines,
      diffResult.noiseReductionPct,
      ignored,
    );
    await this.githubClient.createIssueComment(
      parseInt(context.installationId, 10),
      context.owner,
      context.repo,
      context.prNumber,
      body,
    );
  }

  private async handleIgnore(payload: CommandJobPayload): Promise<void> {
    const pattern = payload.args?.trim();
    if (!pattern) {
      await this.postAck(
        payload,
        '**ClearPR** — `@clearpr ignore` requires a glob pattern. Example: `@clearpr ignore **/*.generated.ts`',
      );
      return;
    }

    await this.ignoreList.addPattern(payload.repositoryId, payload.prNumber, pattern);
    const patterns = await this.ignoreList.getPatterns(payload.repositoryId, payload.prNumber);
    const list = patterns.map((p) => `- \`${p}\``).join('\n');
    await this.postAck(
      payload,
      `**ClearPR** — Added ignore pattern \`${pattern}\` for this PR.\n\n**Active patterns:**\n${list}`,
    );
  }

  private async handleConfig(payload: CommandJobPayload): Promise<void> {
    const context = await this.buildContext(payload);
    if (!context) return;

    const guidelines = await this.guidelineLoader.load(
      context.repositoryId,
      context.installationId,
      context.owner,
      context.repo,
      context.baseBranch,
    );
    const ignored = await this.ignoreList.getPatterns(context.repositoryId, context.prNumber);

    const lines = [
      '## ClearPR Config',
      '',
      `**LLM provider:** \`${this.config.LLM_PROVIDER}\` (\`${this.config.llmModelWithDefault}\`)`,
      `**Max semantic diff lines:** ${this.config.MAX_DIFF_LINES.toLocaleString()}`,
      `**Max file size:** ${this.config.MAX_FILE_SIZE_KB} KB`,
      `**Review concurrency:** ${this.config.REVIEW_CONCURRENCY}`,
      `**Memory similarity threshold:** ${this.config.SIMILARITY_THRESHOLD}`,
      '',
      `**Guidelines:** ${guidelines ? 'loaded from repo' : '_none found_'}`,
      '',
      '**Ignore patterns (this PR):**',
      ignored.length > 0 ? ignored.map((p) => `- \`${p}\``).join('\n') : '_none_',
    ];

    await this.githubClient.createIssueComment(
      parseInt(context.installationId, 10),
      context.owner,
      context.repo,
      context.prNumber,
      lines.join('\n'),
    );
  }

  private async buildContext(payload: CommandJobPayload): Promise<ReviewContext | null> {
    const [owner, repo] = payload.repoFullName.split('/');
    if (!owner || !repo) {
      this.logger.error({ repoFullName: payload.repoFullName }, 'Invalid repoFullName');
      return null;
    }

    const pr = await this.githubClient.getPullRequest(
      parseInt(payload.installationId, 10),
      owner,
      repo,
      payload.prNumber,
    );

    return {
      repositoryId: payload.repositoryId,
      installationId: payload.installationId,
      owner,
      repo,
      prNumber: payload.prNumber,
      prSha: pr.sha,
      baseBranch: pr.baseBranch,
    };
  }

  private async postAck(payload: CommandJobPayload, body: string): Promise<void> {
    const [owner, repo] = payload.repoFullName.split('/');
    if (!owner || !repo) return;
    await this.githubClient.createIssueComment(
      parseInt(payload.installationId, 10),
      owner,
      repo,
      payload.prNumber,
      body,
    );
  }

  private formatDiffComment(
    files: FileDiff[],
    totalRaw: number,
    totalSemantic: number,
    noisePct: number,
    ignored: string[],
  ): string {
    const nonEmpty = files.filter((f) => f.semanticLines > 0);

    const lines = [
      '## ClearPR Semantic Diff',
      '',
      `**${totalRaw.toLocaleString()}** raw lines → **${totalSemantic.toLocaleString()}** semantic lines (${noisePct}% noise filtered)`,
      '',
    ];

    if (nonEmpty.length === 0) {
      lines.push('No semantic changes detected — all differences are formatting noise.');
    } else {
      lines.push('| File | Raw | Semantic | Strategy |');
      lines.push('|------|-----|----------|----------|');
      for (const file of nonEmpty) {
        lines.push(
          `| \`${file.filePath}\` | ${file.rawLines} | ${file.semanticLines} | ${file.strategy} |`,
        );
      }
    }

    if (ignored.length > 0) {
      lines.push('', '**Ignore patterns applied:**', ignored.map((p) => `- \`${p}\``).join('\n'));
    }

    return lines.join('\n');
  }
}
