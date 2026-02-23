/**
 * Dictionary loader
 *
 * Loads the pre-built CC-CEDICT JSON files produced by
 *   node scripts/build-dictionary.js
 *
 * Two files:
 *   assets/dict/cedict-core.json  – HSK 1-6 (~5k entries) – loaded eagerly
 *   assets/dict/cedict-full.json  – everything else (~115k) – loaded lazily
 *
 * Each entry: { s, p, d, h? }
 *   s = simplified, p = pinyin (tone marks),
 *   d = definitions[], h = HSK level (1-6, only in core)
 */

import { DictionaryEntry, ExampleSentence } from '../data/dictionary';

// ---------- Types for raw JSON ---------

interface RawEntry {
  s: string;      // simplified
  p: string;      // pinyin (tone-marked)
  d: string[];    // definitions
  h?: number;     // HSK level
}

// ---------- In-memory index -------------

let indexBySimplified: Map<string, DictionaryEntry> | null = null;

let coreLoaded = false;
let fullLoaded = false;

// ---------- Convert raw → DictionaryEntry ----------

let idCounter = 0;

function toEntry(raw: RawEntry): DictionaryEntry {
  idCounter++;
  return {
    id: String(idCounter),
    simplified: raw.s,
    pinyin: raw.p,
    definitions: raw.d,
    pos: '',
    hskLevel: raw.h,
    examples: [] as ExampleSentence[],
  };
}

// ---------- Loading ----------

function ensureMaps() {
  if (!indexBySimplified) {
    indexBySimplified = new Map();
  }
}

function addEntries(rawList: RawEntry[]) {
  ensureMaps();
  for (const raw of rawList) {
    const entry = toEntry(raw);
    if (!indexBySimplified!.has(entry.simplified)) {
      indexBySimplified!.set(entry.simplified, entry);
    }
  }
}

/**
 * Load the core (HSK 1-6) dictionary. Fast – ~5k entries.
 * Safe to call multiple times; only loads once.
 */
export async function loadCoreDictionary(): Promise<void> {
  if (coreLoaded) return;
  try {
    // Metro resolves require() at build time for JSON
    const data: RawEntry[] = require('../../assets/dict/cedict-core.json');
    addEntries(data);
    coreLoaded = true;
    console.log(`[dict] Core loaded: ${data.length} entries`);
  } catch (e) {
    console.warn('[dict] Could not load cedict-core.json — run: node scripts/build-dictionary.js');
  }
}

/**
 * Load the full dictionary (everything outside HSK). ~115k entries.
 * Loaded lazily on first lookup miss in core.
 */
export async function loadFullDictionary(): Promise<void> {
  if (fullLoaded) return;
  try {
    const data: RawEntry[] = require('../../assets/dict/cedict-full.json');
    addEntries(data);
    fullLoaded = true;
    console.log(`[dict] Full loaded: ${data.length} entries`);
  } catch (e) {
    console.warn('[dict] Could not load cedict-full.json — run: node scripts/build-dictionary.js');
  }
}

// ---------- Lookup API ----------

/**
 * Search for a word. Loads core on first call.
 * If not found in core, lazily loads full dictionary and retries.
 */
export async function searchDictionary(word: string): Promise<DictionaryEntry | null> {
  if (!coreLoaded) await loadCoreDictionary();

  const hit = indexBySimplified?.get(word);
  if (hit) return hit;

  if (!fullLoaded) {
    await loadFullDictionary();
    return indexBySimplified?.get(word) ?? null;
  }

  return null;
}

/**
 * Synchronous lookup — only searches what's already loaded.
 */
export function searchDictionarySync(word: string): DictionaryEntry | null {
  return indexBySimplified?.get(word) ?? null;
}

// ---------- Legacy compat (used by old code) ----------

export async function searchHSK(word: string): Promise<DictionaryEntry | null> {
  return searchDictionary(word);
}

export async function loadAllHSK(): Promise<DictionaryEntry[]> {
  await loadCoreDictionary();
  return Array.from(indexBySimplified?.values() ?? []).filter(e => e.hskLevel);
}

export function getHSKWordCount(level: number): number {
  if (!indexBySimplified) return 0;
  let count = 0;
  for (const e of indexBySimplified.values()) {
    if (e.hskLevel === level) count++;
  }
  return count;
}