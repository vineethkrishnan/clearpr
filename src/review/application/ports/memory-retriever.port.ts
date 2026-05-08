/**
 * Port for fetching past review feedback relevant to a diff.
 *
 * Owned by the review module so the orchestrator depends on a contract,
 * not on a concrete use case from the memory module. The binding to
 * the memory module's implementation lives in `ReviewModule`.
 */
export abstract class MemoryRetrieverPort {
  abstract findRelevant(repositoryId: string, diffSummary: string): Promise<string | null>;
}
