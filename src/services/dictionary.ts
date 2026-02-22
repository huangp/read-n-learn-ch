/**
 * Dictionary lookup service
 * Provides word definitions, pinyin, and example sentences
 */

import { pinyin } from 'pinyin';
import {
  dictionaryData,
  characterData,
  DictionaryEntry,
  WordLookupResult,
  CharacterBreakdown,
} from '../data/dictionary';

/**
 * Look up a word in the dictionary
 * 
 * @param word - The Chinese word to look up
 * @returns Word lookup result with definitions, examples, and character breakdown
 */
export function lookupWord(word: string): WordLookupResult | null {
  // Find exact match in dictionary
  const entry = dictionaryData.find(
    (item) => item.simplified === word || item.traditional === word
  );

  if (entry) {
    return {
      word: entry.simplified,
      pinyin: entry.pinyin,
      definitions: entry.definitions,
      pos: entry.pos,
      hskLevel: entry.hskLevel,
      examples: entry.examples,
      characters: getCharacterBreakdown(entry.simplified),
    };
  }

  // If not in dictionary, generate pinyin for the word
  const generatedPinyin = generatePinyin(word);
  
  return {
    word,
    pinyin: generatedPinyin,
    definitions: ['(Not in dictionary)'],
    pos: 'unknown',
    examples: [],
    characters: getCharacterBreakdown(word),
  };
}

/**
 * Check if a word exists in the dictionary
 * 
 * @param word - The word to check
 * @returns true if word exists in dictionary
 */
export function isWordInDictionary(word: string): boolean {
  return dictionaryData.some(
    (item) => item.simplified === word || item.traditional === word
  );
}

/**
 * Get character breakdown for a multi-character word
 * 
 * @param word - The word to break down
 * @returns Array of character breakdowns
 */
function getCharacterBreakdown(word: string): CharacterBreakdown[] {
  const characters: CharacterBreakdown[] = [];
  
  for (const char of word) {
    // Only process Chinese characters
    if (/[\u4e00-\u9fa5]/.test(char)) {
      const charData = characterData[char];
      
      if (charData) {
        characters.push({
          char,
          pinyin: charData.pinyin,
          literalMeaning: charData.literal,
          contextualMeaning: charData.contextual,
        });
      } else {
        // Generate pinyin for unknown characters
        const generatedPinyin = generatePinyin(char);
        characters.push({
          char,
          pinyin: generatedPinyin,
          literalMeaning: '(unknown)',
          contextualMeaning: '(unknown)',
        });
      }
    }
  }
  
  return characters;
}

/**
 * Generate pinyin for a word or character using the pinyin library
 * 
 * @param text - The text to convert to pinyin
 * @returns Pinyin string with tone marks
 */
function generatePinyin(text: string): string {
  try {
    const result = pinyin(text, {
      style: pinyin.STYLE_TONE, // With tone marks
      heteronym: false, // Use most common pronunciation
    });
    
    // Flatten array and join with spaces
    return result.map((arr) => arr[0]).join(' ');
  } catch (error) {
    console.error('Error generating pinyin:', error);
    return '';
  }
}

/**
 * Get all words from dictionary (for debugging or listing)
 * 
 * @returns Array of all dictionary entries
 */
export function getAllDictionaryEntries(): DictionaryEntry[] {
  return dictionaryData;
}

/**
 * Search dictionary by definition (English keyword)
 * 
 * @param keyword - English keyword to search for
 * @returns Matching dictionary entries
 */
export function searchByDefinition(keyword: string): DictionaryEntry[] {
  const lowerKeyword = keyword.toLowerCase();
  return dictionaryData.filter((entry) =>
    entry.definitions.some((def) =
003e def.toLowerCase().includes(lowerKeyword))
  );
}

/**
 * Get words by HSK level
 * 
 * @param level - HSK level (1-6)
 * @returns Words at that HSK level
 */
export function getWordsByHSKLevel(level: number): DictionaryEntry[] {
  return dictionaryData.filter((entry) => entry.hskLevel === level);
}