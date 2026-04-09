import { EntitySchema } from 'typeorm';

export interface RepositoryRow {
  id: string;
  installation_id: string;
  github_repo_id: number;
  full_name: string;
  settings: Record<string, unknown>;
  indexing_status: string;
  created_at: Date;
  updated_at: Date;
}

export const RepositorySchema = new EntitySchema<RepositoryRow>({
  name: 'repository',
  tableName: 'repositories',
  columns: {
    id: { type: 'uuid', primary: true },
    installation_id: { type: 'uuid' },
    github_repo_id: { type: 'bigint', unique: true },
    full_name: { type: 'varchar', length: 255 },
    settings: { type: 'jsonb', default: {} },
    indexing_status: { type: 'varchar', length: 20, default: 'pending' },
    created_at: { type: 'timestamptz', createDate: true },
    updated_at: { type: 'timestamptz', updateDate: true },
  },
});
