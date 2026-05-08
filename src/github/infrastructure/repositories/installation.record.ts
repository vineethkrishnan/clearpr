import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('installations')
export class InstallationRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'bigint', unique: true })
  github_installation_id!: number;

  @Column({ type: 'varchar', length: 255 })
  account_login!: string;

  @Column({ type: 'varchar', length: 20 })
  account_type!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
