import type {
  DiffInput,
  SemanticDiffResult,
} from '../../../diff-engine/application/types/diff-result.types.js';

/**
 * Port for computing the semantic (noise-filtered) diff of a pull request.
 *
 * Owned by the review module so the orchestrator depends on a contract
 * rather than the concrete diff-engine use case. The binding to the
 * diff-engine implementation lives in `ReviewModule`.
 */
export abstract class DiffComputerPort {
  abstract computeDiff(input: DiffInput): Promise<SemanticDiffResult>;
}
