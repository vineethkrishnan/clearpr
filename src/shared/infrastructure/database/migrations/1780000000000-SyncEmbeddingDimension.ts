import { MigrationInterface, QueryRunner } from 'typeorm';

// Aligns pr_memory.embedding with EMBEDDING_DIMENSIONS so switching embedding
// providers (e.g. Voyage 512-dim to a local model at 384-dim) keeps the pgvector
// column dimension correct. Only acts when the dimension actually changes; the
// existing vectors are model-specific and cannot survive a dimension change, so
// the table is truncated rather than nulled (which the NOT NULL column forbids).
export class SyncEmbeddingDimension1780000000000 implements MigrationInterface {
  name = 'SyncEmbeddingDimension1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const targetDimension = parseInt(process.env['EMBEDDING_DIMENSIONS'] ?? '512', 10);
    if (!Number.isInteger(targetDimension) || targetDimension < 64) {
      throw new Error('EMBEDDING_DIMENSIONS must be an integer >= 64');
    }

    const currentDimension = await this.readEmbeddingDimension(queryRunner);
    if (currentDimension === targetDimension) return;

    await queryRunner.query('DROP INDEX IF EXISTS idx_pr_memory_embedding');
    await queryRunner.query('TRUNCATE TABLE pr_memory');
    await queryRunner.query(
      `ALTER TABLE pr_memory ALTER COLUMN embedding TYPE vector(${targetDimension})`,
    );
    await queryRunner.query(
      'CREATE INDEX idx_pr_memory_embedding ON pr_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)',
    );
  }

  public async down(): Promise<void> {
    // No-op: the dimension is derived from EMBEDDING_DIMENSIONS, so reverting is
    // a forward re-run of this migration with the previous value set.
  }

  private async readEmbeddingDimension(queryRunner: QueryRunner): Promise<number | null> {
    const rows = (await queryRunner.query(
      `SELECT format_type(atttypid, atttypmod) AS type
       FROM pg_attribute
       WHERE attrelid = 'pr_memory'::regclass AND attname = 'embedding'`,
    )) as Array<{ type: string }>;

    const dimension = rows[0]?.type.match(/vector\((\d+)\)/)?.[1];
    return dimension ? parseInt(dimension, 10) : null;
  }
}
