import { Injectable } from '@nestjs/common';
import { GuidelineSourcePort } from '../../domain/ports/guideline-source.port.js';
import { GitHubClientService } from '../../../github/application/services/github-client.service.js';

@Injectable()
export class GitHubGuidelineSourceAdapter extends GuidelineSourcePort {
  constructor(private readonly githubClient: GitHubClientService) {
    super();
  }

  async getFileContent(
    _repositoryId: string,
    installationId: string,
    owner: string,
    repo: string,
    ref: string,
    filePath: string,
  ): Promise<string | null> {
    return this.githubClient.getFileContent(
      parseInt(installationId, 10),
      owner,
      repo,
      ref,
      filePath,
    );
  }
}
