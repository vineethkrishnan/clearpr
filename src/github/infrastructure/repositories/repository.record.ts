import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('repositories')
export class RepositoryRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  installation_id!: string;

  @Column({ type: 'bigint', unique: true })
  github_repo_id!: number;

  @Column({ type: 'varchar', length: 255 })
  full_name!: string;

  @Column({ type: 'jsonb', default: {} })
  settings!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  indexing_status!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
