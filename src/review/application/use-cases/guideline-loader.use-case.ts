import { Injectable, Logger } from '@nestjs/common';
import { FileContentProviderPort } from '../../../diff-engine/domain/ports/file-content-provider.port.js';

const GUIDELINE_FILES = ['claude.md', 'agent.md', '.reviewconfig'] as const;

@Injectable()
export class GuidelineLoaderService {
  private readonly logger = new Logger(GuidelineLoaderService.name);

  constructor(private readonly fileProvider: FileContentProviderPort) {}

  async load(
    repositoryId: string,
    installationId: string,
    owner: string,
    repo: string,
    baseBranch: string,
  ): Promise<string | null> {
    for (const file of GUIDELINE_FILES) {
      const content = await this.fileProvider.getFileContent(
        repositoryId,
        installationId,
        owner,
        repo,
        baseBranch,
        file,
      );
      if (content) {
        this.logger.debug({ repositoryId, file }, `Guidelines loaded from ${file}`);
        return content;
      }
    }

    this.logger.debug({ repositoryId }, 'No guidelines found');
    return null;
  }
}
