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
