import * as SQLite from 'expo-sqlite';
import {
  ArticleMeta,
  DB_NAMES,
  getDatabase,
  initializeCharacterRecognitionDB,
  Tag,
} from '../utils/database';

import {VocabularyDBUtils} from "../utils/database/vocabulary";
import {
  cancelReadingSession,
  completeReadingSession,
  getAllArticleMeta,
  getArticleMeta,
  getCurrentSessionData,
  getOverallStats,
  saveArticleMeta,
  startReadingSession,
  trackDisplayedContent,
  updateReadingSession
} from "../utils/database/article";

import {searchDictionarySync} from "./dictionaryLoader";

// Re-export types from database utils for backward compatibility
export type {
  VocabularyItem,
  ReadingSession,
  ArticleMeta,
  Tag,
  CharacterTag,
} from '../utils/database/types';

class CharacterRecognitionService {
  private db: SQLite.SQLiteDatabase | null = null;
  private vocabularyDBUtils: VocabularyDBUtils | null = null;

  async initialize(): Promise<void> {
    try {
      await initializeCharacterRecognitionDB();

      this.db = getDatabase(DB_NAMES.CHARACTER_RECOGNITION);
      this.vocabularyDBUtils = await VocabularyDBUtils.create();
      await this.prepopulateHSKData();
      console.log('CharacterRecognitionService initialized');
    } catch (error) {
      console.error('Error initializing CharacterRecognitionService:', error);
      throw error;
    }
  }

  private async prepopulateHSKData(): Promise<void> {
    if (!this.db || !this.vocabularyDBUtils) return;

    console.log('[HSK] Pre-populating HSK data from dictionary...');

    // Get HSK data from dictionary database
    const { getDictionaryDBUtil } = await import('./dictionaryLoader');
    const dictUtil = getDictionaryDBUtil();
    
    if (!dictUtil) {
      console.log('[HSK] Dictionary not ready, skipping pre-population');
      return;
    }

    // Query all entries with HSK levels
    const entries = await dictUtil.getAllDictionaryEntries();

    if (!entries || entries.length === 0) {
      console.log('[HSK] No HSK data found in dictionary');
      return;
    }

    console.log(`[HSK] Found ${entries.length} dictionary entries with HSK levels`);

    const now = Date.now();

    // Track characters and their lowest HSK level
    const charToLowestLevel = new Map<string, number>();
    const wordsByLevel = new Map<number, Set<string>>();

    // Initialize sets for each level
    for (let level = 1; level <= 6; level++) {
      wordsByLevel.set(level, new Set<string>());
    }

    // Process entries - track lowest HSK level for each character
    for (const entry of entries) {
      const word = entry.simplified;
      const level = entry.hsk_level;
      
      if (!word || !level || level < 1 || level > 6) continue;
      
      // Add word to its level
      wordsByLevel.get(level)?.add(word);
      
      // Track characters with their lowest HSK level
      for (const char of word) {
        if (/[\u4e00-\u9fa5]/.test(char)) {
          const currentLevel = charToLowestLevel.get(char);
          if (!currentLevel || level < currentLevel) {
            charToLowestLevel.set(char, level);
          }
        }
      }
    }

    // Insert all vocabulary (words and characters) into unified table
    console.log(`[HSK] Processing ${entries.length} vocabulary items`);
    
    await this.vocabularyDBUtils.insertVocabularyFromDictEntries(entries);

    // Insert individual characters with their lowest HSK level
    console.log(`[HSK] Processing ${charToLowestLevel.size} unique characters`);

    const charEntries = [...charToLowestLevel]
        .map(([char, level]) => ({
          simplified: char,
          hsk_level: level
        }));
    await this.vocabularyDBUtils.insertVocabularyFromDictEntries(charEntries);
    charEntries.forEach(async (charEntry) => {
      try {
        await this.autoTagVocabularyByHSK(charEntry.simplified, charEntry.hsk_level);
      } catch (e) {
        console.warn(`[HSK] processing failed to add tag to ${charEntry.simplified}`, e);
      }
    });

    console.log('[HSK] Pre-population complete');
  }

  async startReadingSession(articleId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return startReadingSession(this.db, articleId);
  }

  async trackDisplayedContent(
    sessionId: number,
    characters: string[],
    words: string[],
    articleId?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await trackDisplayedContent(this.db, sessionId, characters, words, articleId);
  }

  async markWordAsLookedUp(sessionId: number, word: string): Promise<void> {
    if (!this.db || !this.vocabularyDBUtils) throw new Error('Database not initialized');

    const chars = word.split('');

    // Get current session data
    const {wordsLookedUp, charactersLookedUp, articleId} = await getCurrentSessionData(this.db, sessionId);
    // Update session lookup lists

    if (!wordsLookedUp.includes(word)) {
      wordsLookedUp.push(word);
    }

    for (const char of chars) {
      if (!charactersLookedUp.includes(char)) {
        charactersLookedUp.push(char);
      }
    }

    await updateReadingSession(this.db, wordsLookedUp, charactersLookedUp, sessionId);

    // Decrease word familiarity (min 0)
    this.vocabularyDBUtils.decreaseFamiliarity(word).catch(err =>
      console.warn('[Learning] Failed to decrease familiarity for word:', word, err)
    );

    // Log lookup
    this.vocabularyDBUtils.logWordLookup(word, articleId!, sessionId).catch(err =>
      console.warn('[Learning] Failed to log word lookup:', word, err)
    );
    // Auto-tag word and characters as "learning" (async - don't block)
    this.vocabularyDBUtils.autoTagVocabularyAsLearning(word).catch(err =>
      console.warn('[Learning] Failed to tag word:', word, err)
    );
    for (const char of chars) {
      this.vocabularyDBUtils.autoTagVocabularyAsLearning(char).catch(err =>
        console.warn('[Learning] Failed to tag character:', char, err)
      );
    }
  }

  async completeReadingSession(sessionId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await completeReadingSession(this.db, sessionId);
  }

  async cancelReadingSession(sessionId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await cancelReadingSession(this.db, sessionId);
  }

  async getOverallStats(): Promise<{
    totalVocabulary: number;
    knownVocabulary: number;
    learningVocabulary: number;
    unknownVocabulary: number;
    totalSessions: number;
    totalLookups: number;
  }> {
    if (!this.db) {
      return {
        totalVocabulary: 0,
        knownVocabulary: 0,
        learningVocabulary: 0,
        unknownVocabulary: 0,
        totalSessions: 0,
        totalLookups: 0,
      };
    }

    return await getOverallStats(this.db);
  }
// ---- Article Meta ----

  /**
   * Compute and store article metadata: total/unique/unknown chars, HSK distribution.
   * Call this when an article is saved or opened.
   *
   * @param articleId  The article ID
   * @param content    The article's raw text content
   * @param words      Segmented Chinese words (from article.segments)
   */
  async saveArticleMeta(
    articleId: string,
    content: string,
    words: string[]
  ): Promise<ArticleMeta> {
    if (!this.vocabularyDBUtils) throw new Error('Database not initialized');
    const now = Date.now();

    // Total and unique Chinese characters
    const allChars = content.match(/[\u4e00-\u9fa5]/g) || [];
    const distinctChars = [...new Set(allChars)];
    const totalChars = allChars.length;
    const uniqueChars = distinctChars.length;

    // Unknown characters
    let unknownChars = 0;
    if (this.db && distinctChars.length > 0) {
      const knownMap = await this.vocabularyDBUtils.getVocabularyKnownStatus(distinctChars);
      for (const c of distinctChars) {
        if (!knownMap.get(c)) unknownChars++;
      }
    } else {
      unknownChars = uniqueChars;
    }

    // HSK level distribution from segmented words
    // Look up each unique word in the dictionary SQLite DB
    const uniqueWords = [...new Set(words)];
    const hskCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, none: 0 };

    // Use the dictionary DB for HSK levels
    try {
      for (const w of uniqueWords) {
        const entry = searchDictionarySync(w);
        if (entry?.hskLevel && entry.hskLevel >= 1 && entry.hskLevel <= 6) {
          hskCounts[entry.hskLevel as 1 | 2 | 3 | 4 | 5 | 6]++;
        } else {
          hskCounts.none++;
        }
      }
    } catch (err) {
      console.warn('[article_meta] Could not compute HSK distribution:', err);
      hskCounts.none = uniqueWords.length;
    }

    const meta: ArticleMeta = {
      articleId,
      totalChars,
      uniqueChars,
      unknownChars,
      hsk1Count: hskCounts[1],
      hsk2Count: hskCounts[2],
      hsk3Count: hskCounts[3],
      hsk4Count: hskCounts[4],
      hsk5Count: hskCounts[5],
      hsk6Count: hskCounts[6],
      nonHskCount: hskCounts.none,
      updatedAt: now,
    };

    if (this.db) {
      await saveArticleMeta(this.db, articleId, totalChars, uniqueChars, unknownChars, meta);
    }

    return meta;
  }

  /**
   * Get stored article metadata. Returns null if not computed yet.
   */
  async getArticleMeta(articleId: string): Promise<ArticleMeta | null> {
    if (!this.db) return null;

    return await getArticleMeta(this.db, articleId);
  }

  /**
   * Get metadata for all articles. Used for sorting on the HomeScreen.
   * Returns a Map<articleId, ArticleMeta>.
   */
  async getAllArticleMeta(): Promise<Map<string, ArticleMeta>> {
    return getAllArticleMeta(this.db);
  }

  /**
   * Delete article metadata when an article is deleted.
   */
  async deleteArticleMeta(articleId: string): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync('DELETE FROM article_meta WHERE article_id = ?', [articleId]);
  }


  async toggleWordKnown(word: string): Promise<boolean> {
    if (!this.vocabularyDBUtils) throw new Error('Database not initialized');
    return await this.vocabularyDBUtils.toggleWordKnown(word);

  }

  /**
   * Batch fetch is_known status for a list of words.
   * Returns a Map<word, boolean>.
   */
  async getKnownStatusBatch(words: string[]): Promise<Map<string, boolean>> {
    if (!this.vocabularyDBUtils) throw new Error('Database not initialized');
    return this.vocabularyDBUtils.getVocabularyKnownStatus(words);
  }

  // ---- Tag Management ----
  async getAllTags(): Promise<Tag[]> {
    if (!this.vocabularyDBUtils) throw new Error('Database not initialized');
    return await this.vocabularyDBUtils.getAllTags();
  }
  async getVocabularyByTag(tagName: string): Promise<string[]> {
    if (!this.vocabularyDBUtils) throw new Error('Database not initialized');
    return this.vocabularyDBUtils.getVocabularyByTag(tagName);
  }

  async autoTagVocabularyByHSK(vocabularyId: string, hskLevel: number | null): Promise<void> {
    if (!this.db || !this.vocabularyDBUtils) {
      console.warn('Database not initialized, cannot auto-tag vocabulary', this.vocabularyDBUtils);
      return;
    }

    const tagsToApply: string[] = [];

    if (hskLevel && hskLevel >= 1 && hskLevel <= 6) {
      tagsToApply.push(`HSK${hskLevel}`);
    }

    for (const tagName of tagsToApply) {
      await this.vocabularyDBUtils.addTagToVocabulary(vocabularyId, tagName);
    }
  }
// Debug method to execute raw SQL queries
  async executeRawQuery(sql: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Safety check - only allow SELECT queries for safety
    const trimmedSql = sql.trim().toUpperCase();
    if (!trimmedSql.startsWith('SELECT') && !trimmedSql.startsWith('PRAGMA')) {
      throw new Error('Only SELECT and PRAGMA queries are allowed for safety');
    }
    
    try {
      const results = await this.db.getAllAsync(sql);
      return results;
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new CharacterRecognitionService();