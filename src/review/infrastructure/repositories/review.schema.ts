import { EntitySchema } from 'typeorm';

export interface ReviewRow {
  id: string;
  repository_id: string;
  pr_number: number;
  pr_sha: string;
  trigger: string;
  status: string;
  raw_diff_lines: number | null;
  semantic_diff_lines: number | null;
  noise_reduction_pct: number | null;
  model_used: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  review_duration_ms: number | null;
  error_message: string | null;
  created_at: Date;
}

export const ReviewSchema = new EntitySchema<ReviewRow>({
  name: 'review',
  tableName: 'reviews',
  columns: {
    id: { type: 'uuid', primary: true },
    repository_id: { type: 'uuid' },
    pr_number: { type: 'int' },
    pr_sha: { type: 'varchar', length: 40 },
    trigger: { type: 'varchar', length: 20 },
    status: { type: 'varchar', length: 20 },
    raw_diff_lines: { type: 'int', nullable: true },
    semantic_diff_lines: { type: 'int', nullable: true },
    noise_reduction_pct: { type: 'decimal', precision: 5, scale: 2, nullable: true },
    model_used: { type: 'varchar', length: 100, nullable: true },
    prompt_tokens: { type: 'int', nullable: true },
    completion_tokens: { type: 'int', nullable: true },
    review_duration_ms: { type: 'int', nullable: true },
    error_message: { type: 'text', nullable: true },
    created_at: { type: 'timestamptz', createDate: true },
  },
  indices: [
    {
      name: 'idx_reviews_repo_pr_sha',
      columns: ['repository_id', 'pr_number', 'pr_sha'],
    },
  ],
});
