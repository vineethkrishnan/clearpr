import { Injectable } from '@nestjs/common';
import { PrFileListProviderPort } from '../../domain/ports/pr-file-list-provider.port.js';
import { GitHubClientService } from '../../../github/application/services/github-client.service.js';
import type { FileInput } from '../../../diff-engine/application/types/diff-result.types.js';

@Injectable()
export class GitHubPrFileListAdapter extends PrFileListProviderPort {
  constructor(private readonly githubClient: GitHubClientService) {
    super();
  }

  async getPrFiles(
    installationId: string,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<FileInput[]> {
    const files = await this.githubClient.getPullRequestFiles(
      parseInt(installationId, 10),
      owner,
      repo,
      prNumber,
    );

    return files.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
      previousFilename: f.previousFilename,
    }));
  }
}
