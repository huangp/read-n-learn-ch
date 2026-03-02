#!/usr/bin/env node
/**
 * build-dictionary.js
 * Wrapper script that calls the TypeScript implementation
 * 
 * Run: node scripts/build-dictionary.js
 */

const path = require('path');

// Register TypeScript
require('ts-node').register({
  project: path.join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true
});

// Run the TypeScript version
require('../src/utils/database/scripts/buildDictionary').buildDictionary();
