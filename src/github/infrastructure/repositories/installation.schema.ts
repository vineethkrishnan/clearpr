import { EntitySchema } from 'typeorm';

export interface InstallationRow {
  id: string;
  github_installation_id: number;
  account_login: string;
  account_type: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export const InstallationSchema = new EntitySchema<InstallationRow>({
  name: 'installation',
  tableName: 'installations',
  columns: {
    id: { type: 'uuid', primary: true },
    github_installation_id: { type: 'bigint', unique: true },
    account_login: { type: 'varchar', length: 255 },
    account_type: { type: 'varchar', length: 20 },
    status: { type: 'varchar', length: 20, default: 'active' },
    created_at: { type: 'timestamptz', createDate: true },
    updated_at: { type: 'timestamptz', updateDate: true },
  },
});
