import { EntitySchema } from 'typeorm';

export interface PrMemoryRow {
  id: string;
  repository_id: string;
  pr_number: number;
  comment_author: string;
  comment_text: string;
  code_context: string;
  outcome: string;
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
    embedding: { type: 'text' },
    created_at: { type: 'timestamptz', createDate: true },
  },
});
