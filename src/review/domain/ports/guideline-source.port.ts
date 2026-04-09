export abstract class GuidelineSourcePort {
  abstract getFileContent(repositoryId: string, installationId: string, owner: string, repo: string, ref: string, filePath: string): Promise<string | null>;
}
