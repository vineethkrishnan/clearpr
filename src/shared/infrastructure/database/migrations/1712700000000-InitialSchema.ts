import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class InitialSchema1712700000000 implements MigrationInterface {
  name = 'InitialSchema1712700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===========================================================================
    // pgvector extension (not modelled by TypeORM)
    // ===========================================================================
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Embedding dimension must match the chosen embedding model.
    const embeddingDimensions = parseInt(process.env['EMBEDDING_DIMENSIONS'] ?? '512', 10);
    if (!Number.isInteger(embeddingDimensions) || embeddingDimensions < 64) {
      throw new Error('EMBEDDING_DIMENSIONS must be an integer >= 64');
    }

    // ===========================================================================
    // installations
    // ===========================================================================
    await queryRunner.createTable(
      new Table({
        name: 'installations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'github_installation_id',
            type: 'bigint',
            isUnique: true,
          },
          { name: 'account_login', type: 'varchar', length: '255' },
          { name: 'account_type', type: 'varchar', length: '20' },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    // ===========================================================================
    // repositories
    // ===========================================================================
    await queryRunner.createTable(
      new Table({
        name: 'repositories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'installation_id', type: 'uuid' },
          {
            name: 'github_repo_id',
            type: 'bigint',
            isUnique: true,
          },
          { name: 'full_name', type: 'varchar', length: '255' },
          {
            name: 'settings',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'indexing_status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'repositories',
      new TableForeignKey({
        columnNames: ['installation_id'],
        referencedTableName: 'installations',
        referencedColumnNames: ['id'],
      }),
    );

    // ===========================================================================
    // reviews
    // ===========================================================================
    await queryRunner.createTable(
      new Table({
        name: 'reviews',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'repository_id', type: 'uuid' },
          { name: 'pr_number', type: 'int' },
          { name: 'pr_sha', type: 'varchar', length: '40' },
          { name: 'trigger', type: 'varchar', length: '20' },
          { name: 'status', type: 'varchar', length: '20' },
          { name: 'raw_diff_lines', type: 'int', isNullable: true },
          { name: 'semantic_diff_lines', type: 'int', isNullable: true },
          {
            name: 'noise_reduction_pct',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'model_used',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          { name: 'prompt_tokens', type: 'int', isNullable: true },
          { name: 'completion_tokens', type: 'int', isNullable: true },
          { name: 'review_duration_ms', type: 'int', isNullable: true },
          { name: 'error_message', type: 'text', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'reviews',
      new TableForeignKey({
        columnNames: ['repository_id'],
        referencedTableName: 'repositories',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'idx_reviews_repo_pr_sha',
        columnNames: ['repository_id', 'pr_number', 'pr_sha'],
      }),
    );

    // ===========================================================================
    // pr_memory (embedding column overridden to pgvector type below)
    // ===========================================================================
    await queryRunner.createTable(
      new Table({
        name: 'pr_memory',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'repository_id', type: 'uuid' },
          { name: 'pr_number', type: 'int' },
          { name: 'comment_author', type: 'varchar', length: '255' },
          { name: 'comment_text', type: 'text' },
          { name: 'code_context', type: 'text' },
          { name: 'outcome', type: 'varchar', length: '20' },
          // Placeholder column type. pgvector vector(N) is not modelled by
          // TypeORM; the column is replaced with a raw ALTER below so the
          // dimension stays driven by EMBEDDING_DIMENSIONS.
          { name: 'embedding', type: 'varchar' },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'pr_memory',
      new TableForeignKey({
        columnNames: ['repository_id'],
        referencedTableName: 'repositories',
        referencedColumnNames: ['id'],
      }),
    );

    // Replace the placeholder embedding column with pgvector's vector(N).
    await queryRunner.query(
      `ALTER TABLE pr_memory ALTER COLUMN embedding TYPE vector(${embeddingDimensions}) USING NULL`,
    );
    await queryRunner.query('ALTER TABLE pr_memory ALTER COLUMN embedding SET NOT NULL');

    // Per-column DESC ordering is not modelled by TypeORM's TableIndex.
    await queryRunner.query(
      'CREATE INDEX idx_pr_memory_repo ON pr_memory (repository_id, created_at DESC)',
    );

    // ivfflat index uses pgvector's cosine ops; not modelled by TypeORM.
    await queryRunner.query(
      'CREATE INDEX idx_pr_memory_embedding ON pr_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS pr_memory');
    await queryRunner.query('DROP TABLE IF EXISTS reviews');
    await queryRunner.query('DROP TABLE IF EXISTS repositories');
    await queryRunner.query('DROP TABLE IF EXISTS installations');
  }
}
