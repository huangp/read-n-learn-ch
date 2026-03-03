/**
 * Dictionary data types and interfaces
 * Using a simplified in-memory dictionary for HSK 1-6 words
 * This is a lightweight implementation that can be extended to use SQLite later
 */

export interface DictionaryEntry {
  simplified: string;
  traditional?: string;
  pinyin: string;
  definitions: string[];
  pos: string; // Part of speech
  hskLevel?: number;
  examples: ExampleSentence[];
}

export interface ExampleSentence {
  chinese: string;
  english: string;
}

export interface CharacterBreakdown {
  char: string;
  pinyin: string;
  literalMeaning: string;
  contextualMeaning: string;
}

export interface WordLookupResult {
  word: string;
  pinyin: string;
  definitions: string[];
  pos: string;
  hskLevel?: number;
  examples: ExampleSentence[];
  characters: CharacterBreakdown[];
}

// ---------- Raw JSON entry shape ----------
export interface RawEntry {
  s: string;     // simplified
  p: string;     // pinyin (tone-marked)
  d: string[];   // definitions
  h?: number;    // HSK level
}