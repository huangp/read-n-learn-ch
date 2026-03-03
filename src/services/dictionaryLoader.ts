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

import {DictionaryEntry, RawEntry} from '../data/dictionary';
import {ExampleSentence} from "../types";
import {DictionaryDBUtil} from "../utils/database/dictionary";
import {DB_NAMES, needsRebuild, SCHEMA_VERSIONS} from "../utils/database";


// ---------- State ----------
let dictDBUtil: DictionaryDBUtil | null = null;
let coreLoaded = false;
let fullLoaded = false;
let examplesLoaded = false;

/**
 * Load example sentences from JSON file
 */
async function loadExampleSentences(): Promise<void> {
  if (examplesLoaded) return;
  if (!dictDBUtil) {
    dictDBUtil = await DictionaryDBUtil.create();
  }

  try {
    const examples: ExampleSentence[] = require('../../assets/dict/examples.json');
    if (!examples || examples.length === 0) {
      console.log('[dict] No example sentences found');
      return;
    }

    console.log(`[dict] Loading ${examples.length} example sentences...`);

    // Insert
    await dictDBUtil.insertExampleSentences(examples);


    console.log(`[dict] Loaded ${examples.length} example sentences`);
    examplesLoaded = true;
  } catch (error) {
    console.warn('[dict] Failed to load example sentences:', error);
  }
}

// ---------- Public: load functions ----------

/**
 * Load the core (HSK 1-6) dictionary into SQLite. ~5k entries.
 * Safe to call multiple times; only loads once.
 */
export async function loadCoreDictionary(): Promise<void> {
  if (coreLoaded) return;

  if (!dictDBUtil) {
    dictDBUtil = await DictionaryDBUtil.create();
  }

  const rebuild = await needsRebuild(DB_NAMES.CHARACTER_RECOGNITION, SCHEMA_VERSIONS.CHARACTER_RECOGNITION);

  if (rebuild) {
    console.log('[dict] Building SQLite dictionary...');
    // Clear old data
    await dictDBUtil.deleteOldData();

    const data: RawEntry[] = require('../../assets/dict/cedict-core.json');
    await dictDBUtil.insertDictionaryEntries(data);
    console.log(`[dict] Core inserted: ${data.length} entries`);

    // Load example sentences
    await loadExampleSentences();
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

  if (!dictDBUtil) {
    dictDBUtil = await DictionaryDBUtil.create();
  }

  const rebuild = await needsRebuild(DB_NAMES.CHARACTER_RECOGNITION, SCHEMA_VERSIONS.CHARACTER_RECOGNITION);

  if (rebuild) {
    const data: RawEntry[] = require('../../assets/dict/cedict-full.json');
    await dictDBUtil.insertDictionaryEntries(data);
    console.log(`[dict] Full inserted: ${data.length} entries`);

    console.log('[dict] SQLite dictionary build complete');
  } else {
    console.log('[dict] SQLite dictionary already up to date (full)');
  }

  fullLoaded = true;
}

/**
 * Synchronous lookup using the sync SQLite handle + LRU cache.
 * The cache prevents repeated sync DB calls for the same word.
 */
export function searchDictionarySync(word: string): DictionaryEntry | null {
  if (!dictDBUtil) {
    return null;
  }
  return dictDBUtil.searchDictionarySync(word);
}

export function getDictionaryDBUtil(): DictionaryDBUtil | null {
    return dictDBUtil;
}

// ---------- Example Sentences ----------
/**
 * Get example sentences for a word
 */
export async function getExamplesForWord(
  word: string,
  limit: number = 3
): Promise<ExampleSentence[]> {
    if (!dictDBUtil) {
      dictDBUtil = await DictionaryDBUtil.create();
    }
    return dictDBUtil.getExamplesForWord(word, limit);
}
