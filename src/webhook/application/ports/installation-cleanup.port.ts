export interface InstallationCleanupResult {
  repositoriesDeleted: number;
  reviewsDeleted: number;
  memoryEntriesDeleted: number;
}

/**
 * Port for purging an installation or repository's associated data
 * when GitHub reports them as removed.
 *
 * Owned by the webhook module so its event handlers depend on a
 * contract rather than the review module's concrete cleanup use case.
 * The binding lives in `WebhookModule`.
 */
export abstract class InstallationCleanupPort {
  abstract cleanupInstallation(
    installationId: string,
    githubInstallationId: number,
  ): Promise<InstallationCleanupResult>;

  abstract cleanupRepository(githubRepoId: number): Promise<InstallationCleanupResult | null>;
}
