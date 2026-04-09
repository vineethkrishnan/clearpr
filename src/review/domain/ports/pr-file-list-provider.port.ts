import type { FileInput } from '../../../diff-engine/application/types/diff-result.types.js';

export abstract class PrFileListProviderPort {
  abstract getPrFiles(
    installationId: string,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<FileInput[]>;
}
