/**
 * Dictionary lookup service
 * Provides word definitions, pinyin, and character breakdown.
 *
 * Lookup order:
 *  1. In-memory curated dictionary (data/dictionary.ts — small, has examples)
 *  2. CC-CEDICT via dictionaryLoader (124k+ entries, HSK 1-6 tagged)
 *  3. Fallback: empty pinyin (no external pinyin library needed)
 */

import {
  dictionaryData,
  characterData,
  DictionaryEntry,
  WordLookupResult,
  CharacterBreakdown,
} from '../data/dictionary';
import { searchDictionary, searchDictionarySync } from './dictionaryLoader';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a word – always returns a result (never null).
 */
export async function lookupWordAsync(word: string): Promise<WordLookupResult> {
  console.log('[dictionary] lookupWordAsync called for:', word);

  try {
    // 1. Curated dictionary (has examples)
    const curated = dictionaryData.find((e) => e.simplified === word);
    if (curated) {
      console.log('[dictionary] Found in curated dictionary');
      const chars = await getCharacterBreakdownAsync(curated.simplified);
      return {
        word: curated.simplified,
        pinyin: curated.pinyin,
        definitions: curated.definitions,
        pos: curated.pos,
        hskLevel: curated.hskLevel,
        examples: curated.examples.slice(0, 3),
        characters: chars,
      };
    }

    // 2. CC-CEDICT data (124k+ entries, HSK 1-6 tagged)
    console.log('[dictionary] Searching CC-CEDICT...');
    const cedictEntry = await searchDictionary(word);
    if (cedictEntry) {
      console.log('[dictionary] Found in CC-CEDICT:', cedictEntry.pinyin);
      const chars = await getCharacterBreakdownAsync(cedictEntry.simplified);
      return {
        word: cedictEntry.simplified,
        pinyin: cedictEntry.pinyin,
        definitions: cedictEntry.definitions,
        pos: cedictEntry.pos || '',
        hskLevel: cedictEntry.hskLevel,
        examples: [],
        characters: chars,
      };
    }

    // 3. Fallback
    console.log('[dictionary] Not found, returning fallback');
    const chars = await getCharacterBreakdownAsync(word);
    return {
      word,
      pinyin: '',
      definitions: [],
      pos: '',
      examples: [],
      characters: chars,
    };
  } catch (err) {
    console.error('[dictionary] lookupWordAsync error:', err);
    return {
      word,
      pinyin: '',
      definitions: ['(Error during lookup)'],
      pos: '',
      examples: [],
      characters: [],
    };
  }
}

/**
 * Synchronous version (searches only what's already loaded in memory).
 */
export function lookupWord(word: string): WordLookupResult {
  const entry = dictionaryData.find((e) => e.simplified === word);
  if (entry) {
    return {
      word: entry.simplified,
      pinyin: entry.pinyin,
      definitions: entry.definitions,
      pos: entry.pos,
      hskLevel: entry.hskLevel,
      examples: entry.examples.slice(0, 3),
      characters: getCharacterBreakdown(entry.simplified),
    };
  }

  // Try CC-CEDICT sync (only works if already loaded)
  const cedict = searchDictionarySync(word);
  if (cedict) {
    return {
      word: cedict.simplified,
      pinyin: cedict.pinyin,
      definitions: cedict.definitions,
      pos: '',
      hskLevel: cedict.hskLevel,
      examples: [],
      characters: getCharacterBreakdown(cedict.simplified),
    };
  }

  return {
    word,
    pinyin: '',
    definitions: [],
    pos: '',
    examples: [],
    characters: getCharacterBreakdown(word),
  };
}

/**
 * Check if a word exists in *any* loaded dictionary synchronously.
 */
export function isWordInDictionary(word: string): boolean {
  return dictionaryData.some((e) => e.simplified === word);
}

// Re-export types so consumers don't need to import from data/
export type { WordLookupResult } from '../data/dictionary';

// ---------------------------------------------------------------------------
// Character breakdown helpers
// ---------------------------------------------------------------------------

function getCharacterBreakdown(word: string): CharacterBreakdown[] {
  const characters: CharacterBreakdown[] = [];
  for (const char of word) {
    if (!/[\u4e00-\u9fa5]/.test(char)) continue;

    const data = characterData[char];
    if (data) {
      characters.push({
        char,
        pinyin: data.pinyin,
        literalMeaning: data.literal,
        contextualMeaning: data.contextual,
      });
    } else {
      const cedict = searchDictionarySync(char);
      characters.push({
        char,
        pinyin: cedict?.pinyin || '',
        literalMeaning: cedict?.definitions?.[0] || '',
        contextualMeaning: '',
      });
    }
  }
  return characters;
}

async function getCharacterBreakdownAsync(word: string): Promise<CharacterBreakdown[]> {
  const characters: CharacterBreakdown[] = [];
  for (const char of word) {
    if (!/[\u4e00-\u9fa5]/.test(char)) continue;

    const data = characterData[char];
    if (data) {
      characters.push({
        char,
        pinyin: data.pinyin,
        literalMeaning: data.literal,
        contextualMeaning: data.contextual,
      });
    } else {
      const cedict = await searchDictionary(char);
      characters.push({
        char,
        pinyin: cedict?.pinyin || '',
        literalMeaning: cedict?.definitions?.[0] || '',
        contextualMeaning: '',
      });
    }
  }
  return characters;
}

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

export function getAllDictionaryEntries(): DictionaryEntry[] {
  return dictionaryData;
}

export function searchByDefinition(keyword: string): DictionaryEntry[] {
  const lower = keyword.toLowerCase();
  return dictionaryData.filter((e) =>
    e.definitions.some((d) => d.toLowerCase().includes(lower))
  );
}

export function getWordsByHSKLevel(level: number): DictionaryEntry[] {
  return dictionaryData.filter((e) => e.hskLevel === level);
}