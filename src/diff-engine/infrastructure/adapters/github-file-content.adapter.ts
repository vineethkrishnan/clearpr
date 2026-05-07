import { Injectable } from '@nestjs/common';
import { FileContentProviderPort } from '../../domain/ports/file-content-provider.port.js';
import { GitHubClientService } from '../../../github/application/use-cases/github-client.use-case.js';

@Injectable()
export class GitHubFileContentAdapter extends FileContentProviderPort {
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
