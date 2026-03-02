/**
 * Database reset utility
 * For development use only - deletes database files
 */

import * as fs from 'fs';
import * as path from 'path';

const DB_DIR = path.join(__dirname, '..', '..', '..', '..', 'assets', 'databases');

const DB_FILES = [
  'character_recognition.db',
  'dictionary.db'
];

/**
 * Reset all databases by deleting the files
 */
export function resetDatabases(): void {
  console.log('Resetting databases for development...\n');

  let deletedCount = 0;
  
  for (const dbFile of DB_FILES) {
    const dbPath = path.join(DB_DIR, dbFile);
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log(`  ✓ Deleted ${dbFile}`);
      deletedCount++;
    } else {
      console.log(`  - ${dbFile} not found (already clean)`);
    }
  }

  console.log(`\n${deletedCount} database(s) deleted.`);
  console.log('Restart the app to recreate databases with the latest schema.');
  console.log('\nNote: This is for development only!');
}

// Run if called directly
if (require.main === module) {
  resetDatabases();
}
