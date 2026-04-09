import { Injectable, Logger } from '@nestjs/common';
import { GuidelineSourcePort } from '../../domain/ports/guideline-source.port.js';

const GUIDELINE_FILES = ['claude.md', 'agent.md', '.reviewconfig'] as const;

@Injectable()
export class GuidelineLoaderService {
  private readonly logger = new Logger(GuidelineLoaderService.name);

  constructor(private readonly source: GuidelineSourcePort) {}

  async load(
    repositoryId: string,
    installationId: string,
    owner: string,
    repo: string,
    baseBranch: string,
  ): Promise<string | null> {
    for (const file of GUIDELINE_FILES) {
      const content = await this.source.getFileContent(
        repositoryId,
        installationId,
        owner,
        repo,
        baseBranch,
        file,
      );
      if (content) {
        this.logger.debug(
          { repositoryId, file },
          `Guidelines loaded from ${file}`,
        );
        return content;
      }
    }

    this.logger.debug({ repositoryId }, 'No guidelines found');
    return null;
  }
}
