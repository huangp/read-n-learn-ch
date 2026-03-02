/**
 * Database query utilities
 * Raw SQL execution and query helpers
 */

import * as SQLite from 'expo-sqlite';
import { getDatabase } from './connection';
import { DatabaseName, QueryResult, QueryError } from './types';

/**
 * Execute a raw SQL query and return all results
 */
export async function executeRawQuery<T = any>(
  dbName: DatabaseName,
  sql: string,
  params?: SQLite.SQLiteBindParams
): Promise<T[]> {
  const db = getDatabase(dbName);
  if (!db) {
    throw new QueryError(`Database ${dbName} not connected`, sql);
  }

  try {
    return await db.getAllAsync<T>(sql, params ?? []);
  } catch (error) {
    throw new QueryError(
      `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sql,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Execute a raw SQL query and return first result
 */
export async function executeRawQueryFirst<T = any>(
  dbName: DatabaseName,
  sql: string,
  params?: SQLite.SQLiteBindParams
): Promise<T | null> {
  const db = getDatabase(dbName);
  if (!db) {
    throw new QueryError(`Database ${dbName} not connected`, sql);
  }

  try {
    return await db.getFirstAsync<T>(sql, params ?? []);
  } catch (error) {
    throw new QueryError(
      `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sql,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Execute a SQL statement (INSERT, UPDATE, DELETE)
 */
export async function executeStatement(
  dbName: DatabaseName,
  sql: string,
  params?: SQLite.SQLiteBindParams
): Promise<QueryResult> {
  const db = getDatabase(dbName);
  if (!db) {
    throw new QueryError(`Database ${dbName} not connected`, sql);
  }

  try {
    const result = await db.runAsync(sql, params ?? []);
    return {
      data: [],
      rowCount: result.changes || 0,
      lastInsertRowId: result.lastInsertRowId,
    };
  } catch (error) {
    throw new QueryError(
      `Statement failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sql,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Execute multiple SQL statements
 */
export async function executeBatch(
  dbName: DatabaseName,
  sql: string
): Promise<void> {
  const db = getDatabase(dbName);
  if (!db) {
    throw new QueryError(`Database ${dbName} not connected`, sql);
  }

  try {
    await db.execAsync(sql);
  } catch (error) {
    throw new QueryError(
      `Batch execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sql,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Insert multiple rows in a batch
 */
export async function insertBatch<T extends Record<string, any>>(
  dbName: DatabaseName,
  table: string,
  rows: T[],
  batchSize: number = 500
): Promise<number> {
  if (rows.length === 0) return 0;

  const db = getDatabase(dbName);
  if (!db) {
    throw new QueryError(`Database ${dbName} not connected`, `INSERT INTO ${table}`);
  }

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(',');
  const sql = `INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;

  let inserted = 0;

  try {
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      
      for (const row of chunk) {
        const values = columns.map(col => row[col]);
        await db.runAsync(sql, values);
        inserted++;
      }
    }
    return inserted;
  } catch (error) {
    throw new QueryError(
      `Batch insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sql,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get row count for a table
 */
export async function getRowCount(
  dbName: DatabaseName,
  table: string,
  whereClause?: string,
  params?: any[]
): Promise<number> {
  let sql = `SELECT COUNT(*) as count FROM ${table}`;
  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  const result = await executeRawQueryFirst<{ count: number }>(dbName, sql, params);
  return result?.count || 0;
}

/**
 * Check if table exists
 */
export async function tableExists(
  dbName: DatabaseName,
  tableName: string
): Promise<boolean> {
  const result = await executeRawQueryFirst<{ name: string }>(
    dbName,
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [tableName]
  );
  return result !== null;
}

/**
 * Get all table names
 */
export async function getTables(dbName: DatabaseName): Promise<string[]> {
  const results = await executeRawQuery<{ name: string }>(
    dbName,
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  return results.map(r => r.name);
}

/**
 * Get table schema info
 */
export async function getTableInfo(
  dbName: DatabaseName,
  tableName: string
): Promise<{ name: string; type: string }[]> {
  return executeRawQuery<{ name: string; type: string }>(
    dbName,
    `PRAGMA table_info(${tableName})`
  );
}
