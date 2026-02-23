import * as SQLite from 'expo-sqlite';
import { SegmentedWord } from '../types';

const DB_NAME = 'character_recognition.db';

export interface CharacterStats {
  character: string;
  familiarity: number;
  isKnown: boolean;
  firstSeenAt: number;
  lastReviewedAt: number;
  lookupCount: number;
  articleCount: number;
  totalExposures: number;
}

export interface WordStats {
  word: string;
  familiarity: number;
  isKnown: boolean;
  firstSeenAt: number;
  lastReviewedAt: number;
  lookupCount: number;
  articleCount: number;
  totalExposures: number;
  characterCount: number;
}

export interface ReadingSession {
  id: number;
  articleId: string;
  startedAt: number;
  completedAt?: number;
  charactersDisplayed: string[];
  wordsDisplayed: string[];
  charactersLookedUp: string[];
  wordsLookedUp: string[];
  familiarityIncremented: boolean;
}

export interface ArticleMeta {
  articleId: string;
  totalChars: number;
  uniqueChars: number;
  unknownChars: number;
  hsk1Count: number;
  hsk2Count: number;
  hsk3Count: number;
  hsk4Count: number;
  hsk5Count: number;
  hsk6Count: number;
  nonHskCount: number;
  updatedAt: number;
}

class CharacterRecognitionService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
      console.log('CharacterRecognitionService initialized');
    } catch (error) {
      console.error('Error initializing CharacterRecognitionService:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS character_stats (
        character TEXT PRIMARY KEY,
        familiarity INTEGER DEFAULT 0,
        is_known BOOLEAN DEFAULT 0,
        first_seen_at INTEGER,
        last_reviewed_at INTEGER,
        lookup_count INTEGER DEFAULT 0,
        article_count INTEGER DEFAULT 0,
        total_exposures INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS word_stats (
        word TEXT PRIMARY KEY,
        familiarity INTEGER DEFAULT 0,
        is_known BOOLEAN DEFAULT 0,
        first_seen_at INTEGER,
        last_reviewed_at INTEGER,
        lookup_count INTEGER DEFAULT 0,
        article_count INTEGER DEFAULT 0,
        total_exposures INTEGER DEFAULT 0,
        character_count INTEGER
      );

      CREATE TABLE IF NOT EXISTS word_characters (
        word TEXT,
        character TEXT,
        position INTEGER,
        PRIMARY KEY (word, character),
        FOREIGN KEY (word) REFERENCES word_stats(word),
        FOREIGN KEY (character) REFERENCES character_stats(character)
      );

      CREATE TABLE IF NOT EXISTS reading_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id TEXT NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        characters_displayed TEXT,
        words_displayed TEXT,
        characters_looked_up TEXT,
        words_looked_up TEXT,
        familiarity_incremented BOOLEAN DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS character_exposure_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character TEXT NOT NULL,
        article_id TEXT NOT NULL,
        session_id INTEGER,
        exposed_at INTEGER,
        was_known_at_exposure BOOLEAN,
        FOREIGN KEY (character) REFERENCES character_stats(character),
        FOREIGN KEY (session_id) REFERENCES reading_sessions(id)
      );

      CREATE TABLE IF NOT EXISTS word_lookup_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        article_id TEXT NOT NULL,
        session_id INTEGER,
        looked_up_at INTEGER,
        character_count INTEGER,
        FOREIGN KEY (word) REFERENCES word_stats(word),
        FOREIGN KEY (session_id) REFERENCES reading_sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_character_stats_familiarity ON character_stats(familiarity);
      CREATE INDEX IF NOT EXISTS idx_character_stats_is_known ON character_stats(is_known);
      CREATE INDEX IF NOT EXISTS idx_word_stats_familiarity ON word_stats(familiarity);
      CREATE INDEX IF NOT EXISTS idx_word_stats_is_known ON word_stats(is_known);
      CREATE INDEX IF NOT EXISTS idx_reading_sessions_article ON reading_sessions(article_id);
      CREATE INDEX IF NOT EXISTS idx_exposure_log_character ON character_exposure_log(character);
      CREATE INDEX IF NOT EXISTS idx_lookup_log_word ON word_lookup_log(word);

      CREATE TABLE IF NOT EXISTS article_meta (
        article_id TEXT PRIMARY KEY,
        total_chars INTEGER DEFAULT 0,
        unique_chars INTEGER DEFAULT 0,
        unknown_chars INTEGER DEFAULT 0,
        hsk1_count INTEGER DEFAULT 0,
        hsk2_count INTEGER DEFAULT 0,
        hsk3_count INTEGER DEFAULT 0,
        hsk4_count INTEGER DEFAULT 0,
        hsk5_count INTEGER DEFAULT 0,
        hsk6_count INTEGER DEFAULT 0,
        non_hsk_count INTEGER DEFAULT 0,
        updated_at INTEGER
      );
    `);
  }

  async startReadingSession(articleId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const result = await this.db.runAsync(
      'INSERT INTO reading_sessions (article_id, started_at) VALUES (?, ?)',
      [articleId, now]
    );

    return result.lastInsertRowId;
  }

  async trackDisplayedContent(
    sessionId: number,
    characters: string[],
    words: string[],
    articleId?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const uniqueChars = [...new Set(characters)];
    const uniqueWords = [...new Set(words)];

    // Resolve articleId from session if not provided
    let resolvedArticleId = articleId;
    if (!resolvedArticleId) {
      const session = await this.db.getFirstAsync<{ article_id: string }>(
        'SELECT article_id FROM reading_sessions WHERE id = ?',
        [sessionId]
      );
      resolvedArticleId = session?.article_id || '';
    }

    // Update reading session
    await this.db.runAsync(
      'UPDATE reading_sessions SET characters_displayed = ?, words_displayed = ? WHERE id = ?',
      [JSON.stringify(uniqueChars), JSON.stringify(uniqueWords), sessionId]
    );

    // Update character stats and log exposures
    for (const char of uniqueChars) {
      // Check if character exists
      const existing = await this.db.getFirstAsync<{ familiarity: number; is_known: boolean }>(
        'SELECT familiarity, is_known FROM character_stats WHERE character = ?',
        [char]
      );

      if (existing) {
        await this.db.runAsync(
          'UPDATE character_stats SET total_exposures = total_exposures + 1, last_reviewed_at = ? WHERE character = ?',
          [now, char]
        );
      } else {
        await this.db.runAsync(
          'INSERT INTO character_stats (character, first_seen_at, last_reviewed_at, total_exposures) VALUES (?, ?, ?, 1)',
          [char, now, now]
        );
      }

      // Log exposure
      await this.db.runAsync(
        'INSERT INTO character_exposure_log (character, article_id, session_id, exposed_at, was_known_at_exposure) VALUES (?, ?, ?, ?, ?)',
        [char, resolvedArticleId, sessionId, now, existing ? existing.is_known : false]
      );
    }

    // Update word stats
    for (const word of uniqueWords) {
      const existing = await this.db.getFirstAsync<{ familiarity: number; is_known: boolean }>(
        'SELECT familiarity, is_known FROM word_stats WHERE word = ?',
        [word]
      );

      if (existing) {
        await this.db.runAsync(
          'UPDATE word_stats SET total_exposures = total_exposures + 1, last_reviewed_at = ? WHERE word = ?',
          [now, word]
        );
      } else {
        const chars = word.split('');
        await this.db.runAsync(
          'INSERT INTO word_stats (word, first_seen_at, last_reviewed_at, total_exposures, character_count) VALUES (?, ?, ?, 1, ?)',
          [word, now, now, chars.length]
        );

        // Link word to characters
        for (let i = 0; i < chars.length; i++) {
          await this.db.runAsync(
            'INSERT OR IGNORE INTO word_characters (word, character, position) VALUES (?, ?, ?)',
            [word, chars[i], i]
          );
        }
      }
    }
  }

  async markWordAsLookedUp(sessionId: number, word: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const chars = word.split('');

    // Get current session data
    const session = await this.db.getFirstAsync<{ 
      article_id: string; 
      words_looked_up: string; 
      characters_looked_up: string 
    }>(
      'SELECT article_id, words_looked_up, characters_looked_up FROM reading_sessions WHERE id = ?',
      [sessionId]
    );

    if (!session) return;

    // Update session lookup lists
    const wordsLookedUp = session.words_looked_up ? JSON.parse(session.words_looked_up) : [];
    const charsLookedUp = session.characters_looked_up ? JSON.parse(session.characters_looked_up) : [];

    if (!wordsLookedUp.includes(word)) {
      wordsLookedUp.push(word);
    }

    for (const char of chars) {
      if (!charsLookedUp.includes(char)) {
        charsLookedUp.push(char);
      }
    }

    await this.db.runAsync(
      'UPDATE reading_sessions SET words_looked_up = ?, characters_looked_up = ? WHERE id = ?',
      [JSON.stringify(wordsLookedUp), JSON.stringify(charsLookedUp), sessionId]
    );

    // Decrease word familiarity (min 0)
    await this.db.runAsync(
      'UPDATE word_stats SET familiarity = MAX(0, familiarity - 1), lookup_count = lookup_count + 1, is_known = 0 WHERE word = ?',
      [word]
    );

    // Decrease character familiarity (min 0)
    for (const char of chars) {
      await this.db.runAsync(
        'UPDATE character_stats SET familiarity = MAX(0, familiarity - 1), lookup_count = lookup_count + 1, is_known = 0 WHERE character = ?',
        [char]
      );
    }

    // Log lookup
    await this.db.runAsync(
      'INSERT INTO word_lookup_log (word, article_id, session_id, looked_up_at, character_count) VALUES (?, ?, ?, ?, ?)',
      [word, session.article_id, sessionId, now, chars.length]
    );
  }

  async completeReadingSession(sessionId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();

    // Get session data
    const session = await this.db.getFirstAsync<{
      characters_displayed: string;
      words_displayed: string;
      familiarity_incremented: boolean;
    }>(
      'SELECT characters_displayed, words_displayed, familiarity_incremented FROM reading_sessions WHERE id = ?',
      [sessionId]
    );

    if (!session || session.familiarity_incremented) return;

    const characters = session.characters_displayed ? JSON.parse(session.characters_displayed) : [];
    const words = session.words_displayed ? JSON.parse(session.words_displayed) : [];

    // Increment character familiarity (capped at 5)
    for (const char of characters) {
      await this.db.runAsync(
        'UPDATE character_stats SET familiarity = MIN(familiarity + 1, 5), is_known = CASE WHEN MIN(familiarity + 1, 5) >= 5 THEN 1 ELSE 0 END, last_reviewed_at = ? WHERE character = ?',
        [now, char]
      );
    }

    // Increment word familiarity (capped at 5)
    for (const word of words) {
      await this.db.runAsync(
        'UPDATE word_stats SET familiarity = MIN(familiarity + 1, 5), is_known = CASE WHEN MIN(familiarity + 1, 5) >= 5 THEN 1 ELSE 0 END, last_reviewed_at = ? WHERE word = ?',
        [now, word]
      );
    }

    // Mark session as completed
    await this.db.runAsync(
      'UPDATE reading_sessions SET completed_at = ?, familiarity_incremented = 1 WHERE id = ?',
      [now, sessionId]
    );
  }

  async cancelReadingSession(sessionId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Just mark as not completed - no familiarity increment
    await this.db.runAsync(
      'UPDATE reading_sessions SET completed_at = NULL, familiarity_incremented = 0 WHERE id = ?',
      [sessionId]
    );
  }

  async getCharacterStats(character: string): Promise<CharacterStats | null> {
    if (!this.db) return null;

    const result = await this.db.getFirstAsync<CharacterStats>(
      'SELECT * FROM character_stats WHERE character = ?',
      [character]
    );

    return result;
  }

  async getWordStats(word: string): Promise<WordStats | null> {
    if (!this.db) return null;

    const result = await this.db.getFirstAsync<WordStats>(
      'SELECT * FROM word_stats WHERE word = ?',
      [word]
    );

    return result;
  }

  async getKnownCharacters(): Promise<CharacterStats[]> {
    if (!this.db) return [];

    return await this.db.getAllAsync<CharacterStats>(
      'SELECT * FROM character_stats WHERE is_known = 1 ORDER BY familiarity DESC'
    );
  }

  async getLearningCharacters(): Promise<CharacterStats[]> {
    if (!this.db) return [];

    return await this.db.getAllAsync<CharacterStats>(
      'SELECT * FROM character_stats WHERE familiarity > 0 AND familiarity < 5 ORDER BY familiarity DESC'
    );
  }

  async getUnknownCharacters(): Promise<CharacterStats[]> {
    if (!this.db) return [];

    return await this.db.getAllAsync<CharacterStats>(
      'SELECT * FROM character_stats WHERE familiarity = 0 ORDER BY total_exposures DESC'
    );
  }

  async getOverallStats(): Promise<{
    totalCharacters: number;
    knownCharacters: number;
    learningCharacters: number;
    unknownCharacters: number;
    totalWords: number;
    knownWords: number;
    learningWords: number;
    unknownWords: number;
    totalSessions: number;
    totalLookups: number;
  }> {
    if (!this.db) {
      return {
        totalCharacters: 0,
        knownCharacters: 0,
        learningCharacters: 0,
        unknownCharacters: 0,
        totalWords: 0,
        knownWords: 0,
        learningWords: 0,
        unknownWords: 0,
        totalSessions: 0,
        totalLookups: 0,
      };
    }

    const charStats = await this.db.getFirstAsync<{
      total: number;
      known: number;
      learning: number;
      unknown: number;
    }>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_known = 1 THEN 1 ELSE 0 END) as known,
        SUM(CASE WHEN familiarity > 0 AND familiarity < 5 THEN 1 ELSE 0 END) as learning,
        SUM(CASE WHEN familiarity = 0 THEN 1 ELSE 0 END) as unknown
      FROM character_stats
    `);

    const wordStats = await this.db.getFirstAsync<{
      total: number;
      known: number;
      learning: number;
      unknown: number;
    }>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_known = 1 THEN 1 ELSE 0 END) as known,
        SUM(CASE WHEN familiarity > 0 AND familiarity < 5 THEN 1 ELSE 0 END) as learning,
        SUM(CASE WHEN familiarity = 0 THEN 1 ELSE 0 END) as unknown
      FROM word_stats
    `);

    const sessionStats = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) as total FROM reading_sessions'
    );

    const lookupStats = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) as total FROM word_lookup_log'
    );

    return {
      totalCharacters: charStats?.total || 0,
      knownCharacters: charStats?.known || 0,
      learningCharacters: charStats?.learning || 0,
      unknownCharacters: charStats?.unknown || 0,
      totalWords: wordStats?.total || 0,
      knownWords: wordStats?.known || 0,
      learningWords: wordStats?.learning || 0,
      unknownWords: wordStats?.unknown || 0,
      totalSessions: sessionStats?.total || 0,
      totalLookups: lookupStats?.total || 0,
    };
  }

  async getArticleReadingHistory(articleId: string): Promise<ReadingSession[]> {
    if (!this.db) return [];

    const sessions = await this.db.getAllAsync<{
      id: number;
      article_id: string;
      started_at: number;
      completed_at: number;
      characters_displayed: string;
      words_displayed: string;
      characters_looked_up: string;
      words_looked_up: string;
      familiarity_incremented: boolean;
    }>(
      'SELECT * FROM reading_sessions WHERE article_id = ? ORDER BY started_at DESC',
      [articleId]
    );

    return sessions.map(s => ({
      id: s.id,
      articleId: s.article_id,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      charactersDisplayed: s.characters_displayed ? JSON.parse(s.characters_displayed) : [],
      wordsDisplayed: s.words_displayed ? JSON.parse(s.words_displayed) : [],
      charactersLookedUp: s.characters_looked_up ? JSON.parse(s.characters_looked_up) : [],
      wordsLookedUp: s.words_looked_up ? JSON.parse(s.words_looked_up) : [],
      familiarityIncremented: s.familiarity_incremented,
    }));
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
    const now = Date.now();

    // Total and unique Chinese characters
    const allChars = content.match(/[\u4e00-\u9fa5]/g) || [];
    const distinctChars = [...new Set(allChars)];
    const totalChars = allChars.length;
    const uniqueChars = distinctChars.length;

    // Unknown characters
    let unknownChars = 0;
    if (this.db && distinctChars.length > 0) {
      const knownMap = await this.getKnownStatusBatch(distinctChars);
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
      const { searchDictionarySync } = require('./dictionaryLoader');
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
      await this.db.runAsync(
        `INSERT OR REPLACE INTO article_meta
          (article_id, total_chars, unique_chars, unknown_chars,
           hsk1_count, hsk2_count, hsk3_count, hsk4_count, hsk5_count, hsk6_count,
           non_hsk_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          articleId, totalChars, uniqueChars, unknownChars,
          meta.hsk1Count, meta.hsk2Count, meta.hsk3Count,
          meta.hsk4Count, meta.hsk5Count, meta.hsk6Count,
          meta.nonHskCount, now,
        ]
      );
    }

    return meta;
  }

  /**
   * Get stored article metadata. Returns null if not computed yet.
   */
  async getArticleMeta(articleId: string): Promise<ArticleMeta | null> {
    if (!this.db) return null;

    const row = await this.db.getFirstAsync<{
      article_id: string;
      total_chars: number;
      unique_chars: number;
      unknown_chars: number;
      hsk1_count: number;
      hsk2_count: number;
      hsk3_count: number;
      hsk4_count: number;
      hsk5_count: number;
      hsk6_count: number;
      non_hsk_count: number;
      updated_at: number;
    }>('SELECT * FROM article_meta WHERE article_id = ?', [articleId]);

    if (!row) return null;

    return {
      articleId: row.article_id,
      totalChars: row.total_chars,
      uniqueChars: row.unique_chars,
      unknownChars: row.unknown_chars,
      hsk1Count: row.hsk1_count,
      hsk2Count: row.hsk2_count,
      hsk3Count: row.hsk3_count,
      hsk4Count: row.hsk4_count,
      hsk5Count: row.hsk5_count,
      hsk6Count: row.hsk6_count,
      nonHskCount: row.non_hsk_count,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get metadata for all articles. Used for sorting on the HomeScreen.
   * Returns a Map<articleId, ArticleMeta>.
   */
  async getAllArticleMeta(): Promise<Map<string, ArticleMeta>> {
    const result = new Map<string, ArticleMeta>();
    if (!this.db) return result;

    const rows = await this.db.getAllAsync<{
      article_id: string;
      total_chars: number;
      unique_chars: number;
      unknown_chars: number;
      hsk1_count: number;
      hsk2_count: number;
      hsk3_count: number;
      hsk4_count: number;
      hsk5_count: number;
      hsk6_count: number;
      non_hsk_count: number;
      updated_at: number;
    }>('SELECT * FROM article_meta');

    for (const row of rows) {
      result.set(row.article_id, {
        articleId: row.article_id,
        totalChars: row.total_chars,
        uniqueChars: row.unique_chars,
        unknownChars: row.unknown_chars,
        hsk1Count: row.hsk1_count,
        hsk2Count: row.hsk2_count,
        hsk3Count: row.hsk3_count,
        hsk4Count: row.hsk4_count,
        hsk5Count: row.hsk5_count,
        hsk6Count: row.hsk6_count,
        nonHskCount: row.non_hsk_count,
        updatedAt: row.updated_at,
      });
    }

    return result;
  }

  /**
   * Delete article metadata when an article is deleted.
   */
  async deleteArticleMeta(articleId: string): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync('DELETE FROM article_meta WHERE article_id = ?', [articleId]);
  }

  async resetAllStats(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      DELETE FROM character_exposure_log;
      DELETE FROM word_lookup_log;
      DELETE FROM word_characters;
      DELETE FROM reading_sessions;
      DELETE FROM word_stats;
      DELETE FROM character_stats;
      DELETE FROM article_meta;
    `);
  }

  /**
   * Toggle a word between known (familiarity=5) and unknown (restore previous familiarity).
   * If toggling to known: saves current familiarity, sets to 5.
   * If toggling to unknown: restores previous familiarity (or sets to 0 if none).
   *
   * We store the "previous familiarity" by convention:
   *   - If is_known and we un-know it, set familiarity to max(familiarity - 1, 0) so it becomes "learning"
   *   - If not known and we mark it known, set familiarity to 5
   */
  async toggleWordKnown(word: string): Promise<boolean> {
    if (!this.db) return false;

    const now = Date.now();

    // Check if word exists in stats
    const existing = await this.db.getFirstAsync<{
      familiarity: number;
      is_known: number;
    }>('SELECT familiarity, is_known FROM word_stats WHERE word = ?', [word]);

    if (existing) {
      if (existing.is_known) {
        // Mark as unknown: drop familiarity below 5
        const newFam = Math.max(existing.familiarity - 1, 0);
        await this.db.runAsync(
          'UPDATE word_stats SET familiarity = ?, is_known = 0, last_reviewed_at = ? WHERE word = ?',
          [newFam, now, word]
        );
        return false; // now unknown
      } else {
        // Mark as known: set to 5
        await this.db.runAsync(
          'UPDATE word_stats SET familiarity = 5, is_known = 1, last_reviewed_at = ? WHERE word = ?',
          [now, word]
        );
        return true; // now known
      }
    } else {
      // Not in stats yet — insert as known
      await this.db.runAsync(
        'INSERT INTO word_stats (word, familiarity, is_known, first_seen_at, last_reviewed_at, total_exposures, character_count) VALUES (?, 5, 1, ?, ?, 0, ?)',
        [word, now, now, word.length]
      );
      return true; // now known
    }
  }

  /**
   * Batch fetch is_known status for a list of words.
   * Returns a Map<word, boolean>.
   */
  async getKnownStatusBatch(words: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    if (!this.db || words.length === 0) return result;

    // SQLite has a limit on query params, process in chunks
    const chunkSize = 500;
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      const rows = await this.db.getAllAsync<{ word: string; is_known: number }>(
        `SELECT word, is_known FROM word_stats WHERE word IN (${placeholders})`,
        chunk
      );
      for (const row of rows) {
        result.set(row.word, row.is_known === 1);
      }
    }

    return result;
  }
}

export default new CharacterRecognitionService();