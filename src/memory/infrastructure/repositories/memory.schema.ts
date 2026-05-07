import { EntitySchema } from 'typeorm';

export interface PrMemoryRow {
  id: string;
  repository_id: string;
  pr_number: number;
  comment_author: string;
  comment_text: string;
  code_context: string;
  outcome: string;
  // Stored as pgvector — TypeORM treats it as string ('[0.1,0.2,...]') in
  // both directions; the repository converts to/from number[] via pgvector.toSql.
  embedding: string;
  created_at: Date;
}

export const PrMemorySchema = new EntitySchema<PrMemoryRow>({
  name: 'pr_memory',
  tableName: 'pr_memory',
  columns: {
    id: { type: 'uuid', primary: true },
    repository_id: { type: 'uuid' },
    pr_number: { type: 'int' },
    comment_author: { type: 'varchar', length: 255 },
    comment_text: { type: 'text' },
    code_context: { type: 'text' },
    outcome: { type: 'varchar', length: 20 },
    embedding: { type: 'varchar' },
    created_at: { type: 'timestamptz', createDate: true },
  },
});
