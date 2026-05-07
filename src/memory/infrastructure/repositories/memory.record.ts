import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('pr_memory')
export class PrMemoryRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  repository_id!: string;

  @Column({ type: 'int' })
  pr_number!: number;

  @Column({ type: 'varchar', length: 255 })
  comment_author!: string;

  @Column({ type: 'text' })
  comment_text!: string;

  @Column({ type: 'text' })
  code_context!: string;

  @Column({ type: 'varchar', length: 20 })
  outcome!: string;

  // pgvector serializes as '[0.1,0.2,...]'; conversion is in the repository.
  @Column({ type: 'varchar' })
  embedding!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
