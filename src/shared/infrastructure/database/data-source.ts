import 'reflect-metadata';
import 'dotenv/config';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { InstallationRecord } from '../../../github/infrastructure/repositories/installation.record.js';
import { RepositoryRecord } from '../../../github/infrastructure/repositories/repository.record.js';
import { ReviewRecord } from '../../../review/infrastructure/repositories/review.record.js';
import { PrMemoryRecord } from '../../../memory/infrastructure/repositories/memory.record.js';

// ===========================================================================
// TypeORM CLI DataSource
// ===========================================================================
// This module exists solely to satisfy the typeorm CLI (migration:generate,
// migration:run, migration:revert). The runtime NestJS connection lives in
// DatabaseModule and is built from AppConfig; we mirror only the bits the
// CLI needs here so it can read DATABASE_URL and discover entities.

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set for migration commands');
}

// Pick the migration extension matching how this file is being loaded.
// Mixing globs (e.g. both .ts and .js) breaks the compiled CJS CLI flow
// under Node's built-in TypeScript loader, which treats .ts matches as ESM.
const migrationsExt = __filename.endsWith('.ts') ? 'ts' : 'js';

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [InstallationRecord, RepositoryRecord, ReviewRecord, PrMemoryRecord],
  migrations: [path.join(__dirname, 'migrations', `*.${migrationsExt}`)],
});
