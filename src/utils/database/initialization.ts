/**
 * Database initialization
 * Coordinates database setup and initialization
 */

import { openDatabase, DB_NAMES } from './connection';
import {
  CHARACTER_RECOGNITION_SCHEMA, DROP_USER_DATA_TABLES,
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
    // TODO this will drop user data table. we should comment out this line to keep the data
    await executeBatch(dbName, DROP_USER_DATA_TABLES);
    await executeBatch(dbName, CHARACTER_RECOGNITION_SCHEMA);
    await setDBVersion(dbName, SCHEMA_VERSIONS.CHARACTER_RECOGNITION);
    console.log(`[DB] ${dbName} schema created`);
  } else {
    console.log(`[DB] ${dbName} is up to date`);
  }
}
