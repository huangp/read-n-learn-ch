/**
 * Database initialization
 * Coordinates database setup and initialization
 */

import { openDatabase, DB_NAMES } from './connection';
import { 
  CHARACTER_RECOGNITION_SCHEMA, 
  DICTIONARY_SCHEMA,
  SCHEMA_VERSIONS 
} from './schema';
import { 
  getDBVersion,
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

/**
 * Initialize the dictionary database
 */
export async function initializeDictionaryDB(): Promise<void> {
  const dbName = DB_NAMES.DICTIONARY;
  
  console.log(`[DB] Initializing ${dbName}...`);
  
  await openDatabase(dbName, { enableSync: true });
  // await ensureMetaTable(dbName);
  
  const shouldRebuild = await needsRebuild(dbName, SCHEMA_VERSIONS.DICTIONARY);
  
  if (shouldRebuild) {
    console.log(`[DB] Building ${dbName} schema...`);
    await executeBatch(dbName, DICTIONARY_SCHEMA);
    await setDBVersion(dbName, SCHEMA_VERSIONS.DICTIONARY);
    console.log(`[DB] ${dbName} schema created`);
  } else {
    console.log(`[DB] ${dbName} is up to date`);
  }
}

/**
 * Initialize all databases
 */
export async function initializeAllDatabases(): Promise<void> {
  try {
    await initializeCharacterRecognitionDB();
    await initializeDictionaryDB();
    console.log('[DB] All databases initialized successfully');
  } catch (error) {
    console.error('[DB] Failed to initialize databases:', error);
    throw error;
  }
}
