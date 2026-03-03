#!/usr/bin/env node
/**
 * reset-db.js
 * Temporary migration script for development
 * Run this to reset the database and apply schema changes
 * 
 * Usage: node scripts/reset-db.js
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'assets', 'databases');
const DB_FILES = [
  'character_recognition.db',
  'dictionary.db'
];

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
console.log('\nNote: This script is for development only!');
