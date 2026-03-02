/**
 * Database connection management
 * Handles opening, closing, and accessing database connections
 */

import * as SQLite from 'expo-sqlite';
import { 
  DatabaseName, 
  DB_NAMES, 
  DBConnection, 
  ConnectionError,
  TransactionCallback 
} from './types';

// Connection registry
const connections: Map<DatabaseName, DBConnection> = new Map();

/**
 * Open a database connection
 */
export async function openDatabase(
  name: DatabaseName,
  options?: { enableSync?: boolean }
): Promise<SQLite.SQLiteDatabase> {
  try {
    const existing = connections.get(name);
    if (existing?.db) {
      return existing.db;
    }

    const db = await SQLite.openDatabaseAsync(name);
    let syncDb: SQLite.SQLiteDatabase | null = null;

    if (options?.enableSync) {
      syncDb = SQLite.openDatabaseSync(name);
    }

    connections.set(name, {
      name,
      db,
      syncDb,
      version: 0,
    });

    console.log(`[DB] Opened database: ${name}`);
    return db;
  } catch (error) {
    throw new ConnectionError(
      `Failed to open database ${name}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get existing database connection
 */
export function getDatabase(name: DatabaseName): SQLite.SQLiteDatabase | null {
  return connections.get(name)?.db || null;
}

/**
 * Get synchronous database handle (if enabled)
 */
export function getSyncDatabase(name: DatabaseName): SQLite.SQLiteDatabase | null {
  return connections.get(name)?.syncDb || null;
}

/**
 * Close a database connection
 */
export async function closeDatabase(name: DatabaseName): Promise<void> {
  const conn = connections.get(name);
  if (!conn) return;

  try {
    if (conn.db) {
      await conn.db.closeAsync();
    }
    if (conn.syncDb) {
      conn.syncDb.closeSync();
    }
    connections.delete(name);
    console.log(`[DB] Closed database: ${name}`);
  } catch (error) {
    throw new ConnectionError(
      `Failed to close database ${name}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Close all database connections
 */
export async function closeAllDatabases(): Promise<void> {
  const promises = Array.from(connections.keys()).map(name => closeDatabase(name));
  await Promise.all(promises);
}

/**
 * Check if database is connected
 */
export function isConnected(name: DatabaseName): boolean {
  const conn = connections.get(name);
  return conn?.db !== null;
}

/**
 * Execute within a transaction
 */
export async function withTransaction<T>(
  name: DatabaseName,
  callback: TransactionCallback<T>
): Promise<T> {
  const conn = connections.get(name);
  if (!conn?.db) {
    throw new ConnectionError(`Database ${name} not connected`);
  }

  try {
    await conn.db.execAsync('BEGIN TRANSACTION');
    const result = await callback(conn.db);
    await conn.db.execAsync('COMMIT');
    return result;
  } catch (error) {
    try {
      await conn.db.execAsync('ROLLBACK');
    } catch (rollbackError) {
      console.error(`[DB] Rollback failed for ${name}:`, rollbackError);
    }
    throw error;
  }
}

// Export database names for convenience
export { DB_NAMES };
