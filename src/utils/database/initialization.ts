/**
 * Database initialization
 * Coordinates database setup and initialization
 */

import { openDatabase, DB_NAMES } from './connection';
import {
  CHARACTER_RECOGNITION_SCHEMA,
  SCHEMA_VERSIONS
} from './schema';
import { 
  setDBVersion,
  needsRebuild 
} from './migrations';
import { executeBatch } from './queries';

/**
 * Initialize the character recognition database
 */
export async function initializeCharacterRecognitionDB(): Promise<void> {
  const dbName = DB_NAMES.CHARACTER_RECOGNITION;
  
  console.log(`[DB] Initializing ${dbName}...`);
  
  await openDatabase(dbName);
  // await ensureMetaTable(dbName);
  
  const shouldRebuild = await needsRebuild(dbName, SCHEMA_VERSIONS.CHARACTER_RECOGNITION);
  
  if (shouldRebuild) {
    console.log(`[DB] Building ${dbName} schema...`);
    await executeBatch(dbName, CHARACTER_RECOGNITION_SCHEMA);
    await setDBVersion(dbName, SCHEMA_VERSIONS.CHARACTER_RECOGNITION);
    console.log(`[DB] ${dbName} schema created`);
  } else {
    console.log(`[DB] ${dbName} is up to date`);
  }
}
