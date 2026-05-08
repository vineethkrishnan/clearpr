import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('reviews')
@Index('idx_reviews_repo_pr_sha', ['repository_id', 'pr_number', 'pr_sha'])
export class ReviewRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  repository_id!: string;

  @Column({ type: 'int' })
  pr_number!: number;

  @Column({ type: 'varchar', length: 40 })
  pr_sha!: string;

  @Column({ type: 'varchar', length: 20 })
  trigger!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ type: 'int', nullable: true })
  raw_diff_lines!: number | null;

  @Column({ type: 'int', nullable: true })
  semantic_diff_lines!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  noise_reduction_pct!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model_used!: string | null;

  @Column({ type: 'int', nullable: true })
  prompt_tokens!: number | null;

  @Column({ type: 'int', nullable: true })
  completion_tokens!: number | null;

  @Column({ type: 'int', nullable: true })
  review_duration_ms!: number | null;

  @Column({ type: 'text', nullable: true })
  error_message!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
