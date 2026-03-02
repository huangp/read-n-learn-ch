#!/usr/bin/env node
/**
 * reset-db.js
 * Wrapper script that calls the TypeScript implementation
 * 
 * Run: node scripts/reset-db.js
 */

const path = require('path');

// Register TypeScript
require('ts-node').register({
  project: path.join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true
});

// Run the TypeScript version
require('../src/utils/database/scripts/resetDatabase').resetDatabases();
