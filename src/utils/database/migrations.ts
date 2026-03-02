/**
 * Database migration utilities
 * Version management and schema migrations
 */

import * as SQLite from 'expo-sqlite';
import { getDatabase } from './connection';
import { DatabaseName, QueryError } from './types';
import { executeRawQueryFirst, executeStatement } from './queries';

/**
 * Get current database version
 */
export async function getDBVersion(dbName: DatabaseName): Promise<number> {
  try {
    const row = await executeRawQueryFirst<{ value: string }>(
      dbName,
      "SELECT value FROM meta WHERE key = 'version'"
    );
    return row ? parseInt(row.value, 10) : 0;
  } catch {
    // Table might not exist yet
    return 0;
  }
}

/**
 * Set database version
 */
export async function setDBVersion(
  dbName: DatabaseName,
  version: number
): Promise<void> {
  await executeStatement(
    dbName,
    "INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ?)",
    [String(version)]
  );
}

/**
 * Check if database needs rebuild
 */
export async function needsRebuild(
  dbName: DatabaseName,
  targetVersion: number
): Promise<boolean> {
  const currentVersion = await getDBVersion(dbName);
  return currentVersion < targetVersion;
}

/**
 * Migration function type
 */
export type MigrationFunction = (db: SQLite.SQLiteDatabase) => Promise<void>;

/**
 * Migration registry entry
 */
export interface Migration {
  version: number;
  name: string;
  migrate: MigrationFunction;
}

/**
 * Run migrations for a database
 */
export async function runMigrations(
  dbName: DatabaseName,
  migrations: Migration[]
): Promise<void> {
  const currentVersion = await getDBVersion(dbName);
  const db = getDatabase(dbName);
  
  if (!db) {
    throw new QueryError(`Database ${dbName} not connected`, 'MIGRATION');
  }

  // Sort migrations by version
  const sortedMigrations = migrations
    .filter(m => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  if (sortedMigrations.length === 0) {
    console.log(`[DB] ${dbName} is up to date (version ${currentVersion})`);
    return;
  }

  console.log(`[DB] Running ${sortedMigrations.length} migration(s) for ${dbName}...`);

  try {
    await db.execAsync('BEGIN TRANSACTION');

    for (const migration of sortedMigrations) {
      console.log(`[DB] Migrating ${dbName} to version ${migration.version}: ${migration.name}`);
      await migration.migrate(db);
      await setDBVersion(dbName, migration.version);
    }

    await db.execAsync('COMMIT');
    console.log(`[DB] Migrations complete for ${dbName}`);
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw new QueryError(
      `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'MIGRATION',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Create meta table if it doesn't exist
 */
export async function ensureMetaTable(dbName: DatabaseName): Promise<void> {
  const db = getDatabase(dbName);
  if (!db) return;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
}
