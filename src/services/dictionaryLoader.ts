/**
 * dictionaryLoader.ts — SQLite-backed dictionary with LRU cache
 *
 * Instead of holding 120k+ entries in a JS Map, we store them in SQLite
 * and only cache recently-accessed entries in memory.
 *
 * On first launch the DB is populated from the bundled JSON files.
 * Subsequent launches just open the existing DB (fast).
 *
 * Public API (unchanged from the old in-memory version):
 *   - loadCoreDictionary()      — called from App.tsx at startup
 *   - loadFullDictionary()      — called from App.tsx at startup
 *   - searchDictionary(word)    — async lookup
 *   - searchDictionarySync(word) — sync lookup (uses LRU cache + sync SQLite)
 */

import * as SQLite from 'expo-sqlite';
import { DictionaryEntry, ExampleSentence } from '../data/dictionary';
import { LRUCache } from '../utils/lruCache';

// ---------- Raw JSON entry shape ----------

interface RawEntry {
  s: string;     // simplified
  p: string;     // pinyin (tone-marked)
  d: string[];   // definitions
  h?: number;    // HSK level
}

// ---------- State ----------

const DB_NAME = 'dictionary.db';
const DB_VERSION = 2; // Bump this to force a rebuild
const CACHE_SIZE = 2000;

let db: SQLite.SQLiteDatabase | null = null;
let dbSync: SQLite.SQLiteDatabase | null = null;
let cache = new LRUCache<string, DictionaryEntry | null>(CACHE_SIZE);

let coreLoaded = false;
let fullLoaded = false;
let idCounter = 0;

// ---------- Helpers ----------

function rowToEntry(row: {
  simplified: string;
  pinyin: string;
  definitions: string;
  hsk_level: number | null;
}): DictionaryEntry {
  idCounter++;
  return {
    id: String(idCounter),
    simplified: row.simplified,
    pinyin: row.pinyin,
    definitions: JSON.parse(row.definitions),
    pos: '',
    hskLevel: row.hsk_level ?? undefined,
    examples: [] as ExampleSentence[],
  };
}

// ---------- DB initialisation ----------

async function openDB(): Promise<void> {
  if (db) return;

  db = await SQLite.openDatabaseAsync(DB_NAME);
  // Also open a sync handle for searchDictionarySync
  dbSync = SQLite.openDatabaseSync(DB_NAME);

  // Create table if needed
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS entries (
      simplified TEXT PRIMARY KEY,
      pinyin TEXT NOT NULL,
      definitions TEXT NOT NULL,
      hsk_level INTEGER
    );
  `);
}

async function getDBVersion(): Promise<number> {
  if (!db) return 0;
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'version'"
  );
  return row ? parseInt(row.value, 10) : 0;
}

async function setDBVersion(v: number): Promise<void> {
  if (!db) return;
  await db.runAsync(
    "INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ?)",
    [String(v)]
  );
}

async function needsRebuild(): Promise<boolean> {
  const v = await getDBVersion();
  return v < DB_VERSION;
}

async function insertBatch(entries: RawEntry[]): Promise<void> {
  if (!db || entries.length === 0) return;

  // Use batched inserts for speed
  const BATCH = 500;
  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH);
    const placeholders = chunk.map(() => '(?,?,?,?)').join(',');
    const params: any[] = [];
    for (const e of chunk) {
      params.push(e.s, e.p, JSON.stringify(e.d), e.h ?? null);
    }
    await db.runAsync(
      `INSERT OR IGNORE INTO entries (simplified, pinyin, definitions, hsk_level) VALUES ${placeholders}`,
      params
    );
  }
}

// ---------- Public: load functions ----------

/**
 * Load the core (HSK 1-6) dictionary into SQLite. ~5k entries.
 * Safe to call multiple times; only loads once.
 */
export async function loadCoreDictionary(): Promise<void> {
  if (coreLoaded) return;

  await openDB();

  const rebuild = await needsRebuild();
  if (rebuild) {
    console.log('[dict] Building SQLite dictionary...');
    // Clear old data
    await db!.execAsync('DELETE FROM entries');

    const data: RawEntry[] = require('../../assets/dict/cedict-core.json');
    await insertBatch(data);
    console.log(`[dict] Core inserted: ${data.length} entries`);
  } else {
    console.log('[dict] SQLite dictionary already up to date (core)');
  }

  coreLoaded = true;
}

/**
 * Load the full dictionary into SQLite. ~115k entries.
 * Safe to call multiple times; only loads once.
 */
export async function loadFullDictionary(): Promise<void> {
  if (fullLoaded) return;

  await openDB();

  const rebuild = await needsRebuild();
  if (rebuild) {
    const data: RawEntry[] = require('../../assets/dict/cedict-full.json');
    await insertBatch(data);
    console.log(`[dict] Full inserted: ${data.length} entries`);

    // Create index after bulk insert (faster)
    await db!.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_entries_hsk ON entries(hsk_level)'
    );

    // Mark version complete
    await setDBVersion(DB_VERSION);
    console.log('[dict] SQLite dictionary build complete');
  } else {
    console.log('[dict] SQLite dictionary already up to date (full)');
  }

  fullLoaded = true;
}

// ---------- Public: lookup API ----------

/**
 * Async search. Opens DB on first call if needed.
 */
export async function searchDictionary(word: string): Promise<DictionaryEntry | null> {
  // Check cache first
  if (cache.has(word)) return cache.get(word) ?? null;

  if (!db) await openDB();

  const row = await db!.getFirstAsync<{
    simplified: string;
    pinyin: string;
    definitions: string;
    hsk_level: number | null;
  }>('SELECT simplified, pinyin, definitions, hsk_level FROM entries WHERE simplified = ?', [word]);

  if (row) {
    const entry = rowToEntry(row);
    cache.set(word, entry);
    return entry;
  }

  cache.set(word, null);
  return null;
}

/**
 * Synchronous lookup using the sync SQLite handle + LRU cache.
 * The cache prevents repeated sync DB calls for the same word.
 */
export function searchDictionarySync(word: string): DictionaryEntry | null {
  // Check cache first
  if (cache.has(word)) return cache.get(word) ?? null;

  if (!dbSync) {
    // DB not initialised yet — shouldn't happen if App.tsx calls loadCoreDictionary
    console.warn('[dict] searchDictionarySync called before DB init');
    return null;
  }

  const row = dbSync.getFirstSync<{
    simplified: string;
    pinyin: string;
    definitions: string;
    hsk_level: number | null;
  }>('SELECT simplified, pinyin, definitions, hsk_level FROM entries WHERE simplified = ?', [word]);

  if (row) {
    const entry = rowToEntry(row);
    cache.set(word, entry);
    return entry;
  }

  cache.set(word, null);
  return null;
}

/**
 * Get the dictionary database instance for direct queries.
 * Returns null if database is not initialized yet.
 */
export function getDictionaryDatabase(): SQLite.SQLiteDatabase | null {
  return db;
}
