import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712700000000 implements MigrationInterface {
  name = 'InitialSchema1712700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Installations
    await queryRunner.query(`
      CREATE TABLE installations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        github_installation_id BIGINT NOT NULL UNIQUE,
        account_login VARCHAR(255) NOT NULL,
        account_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Repositories
    await queryRunner.query(`
      CREATE TABLE repositories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        installation_id UUID NOT NULL REFERENCES installations(id),
        github_repo_id BIGINT NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        settings JSONB NOT NULL DEFAULT '{}',
        indexing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Reviews
    await queryRunner.query(`
      CREATE TABLE reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        repository_id UUID NOT NULL REFERENCES repositories(id),
        pr_number INTEGER NOT NULL,
        pr_sha VARCHAR(40) NOT NULL,
        trigger VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        raw_diff_lines INTEGER,
        semantic_diff_lines INTEGER,
        noise_reduction_pct DECIMAL(5,2),
        model_used VARCHAR(100),
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        review_duration_ms INTEGER,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_reviews_repo_pr_sha ON reviews (repository_id, pr_number, pr_sha)',
    );

    // PR Memory — embedding column uses pgvector. Dimension comes from
    // EMBEDDING_DIMENSIONS (default 512 for voyage-3-lite). Changing model
    // requires recreating the column with a matching dimension.
    const embeddingDimensions = parseInt(process.env['EMBEDDING_DIMENSIONS'] ?? '512', 10);
    if (!Number.isInteger(embeddingDimensions) || embeddingDimensions < 64) {
      throw new Error('EMBEDDING_DIMENSIONS must be an integer >= 64');
    }
    await queryRunner.query(`
      CREATE TABLE pr_memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        repository_id UUID NOT NULL REFERENCES repositories(id),
        pr_number INTEGER NOT NULL,
        comment_author VARCHAR(255) NOT NULL,
        comment_text TEXT NOT NULL,
        code_context TEXT NOT NULL,
        outcome VARCHAR(20) NOT NULL,
        embedding vector(${embeddingDimensions}) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_pr_memory_repo ON pr_memory (repository_id, created_at DESC)',
    );
    // ivfflat index for cosine distance — speeds up <=> queries once the
    // table has enough rows for the planner to prefer it.
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
