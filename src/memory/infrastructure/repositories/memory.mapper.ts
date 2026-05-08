import { PrMemoryEntry } from '../../domain/entities/pr-memory-entry.entity.js';
import { type FeedbackOutcome } from '../../domain/value-objects/feedback-outcome.vo.js';
import { PrMemoryRecord } from './memory.record.js';

/**
 * Maps PrMemoryEntry between domain and DB record forms.
 *
 * The `embedding` field is intentionally NOT handled here: pgvector
 * serialization (toSql / fromSql) is a TypeORM-side concern and lives
 * in the repository. Callers must supply the already-converted embedding
 * to `toDomain` / `toRecord`.
 */
export class PrMemoryMapper {
  static toDomain(record: PrMemoryRecord, embedding: number[]): PrMemoryEntry {
    return new PrMemoryEntry({
      id: record.id,
      repositoryId: record.repository_id,
      prNumber: record.pr_number,
      commentAuthor: record.comment_author,
      commentText: record.comment_text,
      codeContext: record.code_context,
      outcome: record.outcome as FeedbackOutcome,
      embedding,
    });
  }

  static toRecord(entity: PrMemoryEntry, embeddingSql: string): PrMemoryRecord {
    const record = new PrMemoryRecord();
    record.id = entity.id;
    record.repository_id = entity.repositoryId;
    record.pr_number = entity.prNumber;
    record.comment_author = entity.commentAuthor;
    record.comment_text = entity.commentText;
    record.code_context = entity.codeContext;
    record.outcome = entity.outcome;
    record.embedding = embeddingSql;
    record.created_at = entity.createdAt;
    return record;
  }
}
