import {ArticleMeta, DatabaseName, Tag} from "./types";
import {executeStatement} from "./queries";
import * as SQLite from "expo-sqlite";


/**
 * Set database version
 */
export async function setDBVersion(
    dbName: DatabaseName,
    version: number
): Promise<void> {
    await executeStatement(
        dbName,
        "INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ?)",
        [String(version)]
    );
}

export async function startReadingSession(db: SQLite.SQLiteDatabase, articleId: string): Promise<number> {

    const now = Date.now();
    const result = await db.runAsync(
        'INSERT INTO reading_sessions (article_id, started_at) VALUES (?, ?)',
        [articleId, now]
    );

    return result.lastInsertRowId;
}

export async function trackDisplayedContent(
    db: SQLite.SQLiteDatabase,
    sessionId: number,
    characters: string[],
    words: string[],
    articleId?: string
): Promise<void> {

    const now = Date.now();
    const uniqueChars = [...new Set(characters)];
    const uniqueWords = [...new Set(words)];

// Resolve articleId from session if not provided
    let resolvedArticleId = articleId;
    if (!resolvedArticleId) {
        const session = await db.getFirstAsync<{ article_id: string }>(
            'SELECT article_id FROM reading_sessions WHERE id = ?',
            [sessionId]
        );
        resolvedArticleId = session?.article_id || '';
    }

    // Update reading session
    await db.runAsync(
        'UPDATE reading_sessions SET characters_displayed = ?, words_displayed = ? WHERE id = ?',
        [JSON.stringify(uniqueChars), JSON.stringify(uniqueWords), sessionId]
    );
}

export async function getCurrentSessionData(db: SQLite.SQLiteDatabase, sessionId: number): Promise<{
    articleId?: string;
    wordsLookedUp: string[];
    charactersLookedUp: string[];
}> {
    // Get current session data
    const session = await db.getFirstAsync<{
        article_id: string;
        words_looked_up: string;
        characters_looked_up: string
    }>(
        'SELECT article_id, words_looked_up, characters_looked_up FROM reading_sessions WHERE id = ?',
        [sessionId]
    );

    if (!session) return {wordsLookedUp: [], charactersLookedUp: []};

    const wordsLookedUp = session.words_looked_up ? JSON.parse(session.words_looked_up) : [];
    const charsLookedUp = session.characters_looked_up ? JSON.parse(session.characters_looked_up) : [];
    return {
        articleId: session.article_id,
        wordsLookedUp: wordsLookedUp,
        charactersLookedUp: charsLookedUp
    }
}

export async function updateReadingSession(db: SQLite.SQLiteDatabase, wordsLookedUp: string[], charactersLookedUp: string[], sessionId: number): Promise<void> {
    await db.runAsync(
        'UPDATE reading_sessions SET words_looked_up = ?, characters_looked_up = ? WHERE id = ?',
        [JSON.stringify(wordsLookedUp), JSON.stringify(charactersLookedUp), sessionId]
    );
}

export async function saveArticleMeta(db: SQLite.SQLiteDatabase, articleId: string, totalChars: number, uniqueChars: number, unknownChars: number, meta: ArticleMeta) {
    await db.runAsync(
        `INSERT INTO article_meta
          (article_id, total_chars, unique_chars, unknown_chars,
           hsk1_count, hsk2_count, hsk3_count, hsk4_count, hsk5_count, hsk6_count,
           non_hsk_count, read_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT(article_id) DO UPDATE SET
           total_chars = excluded.total_chars,
           unique_chars = excluded.unique_chars,
           unknown_chars = excluded.unknown_chars,
           hsk1_count = excluded.hsk1_count,
           hsk2_count = excluded.hsk2_count,
           hsk3_count = excluded.hsk3_count,
           hsk4_count = excluded.hsk4_count,
           hsk5_count = excluded.hsk5_count,
           hsk6_count = excluded.hsk6_count,
           non_hsk_count = excluded.non_hsk_count,
           updated_at = excluded.updated_at`,
        [
            articleId, totalChars, uniqueChars, unknownChars,
            meta.hsk1Count, meta.hsk2Count, meta.hsk3Count,
            meta.hsk4Count, meta.hsk5Count, meta.hsk6Count,
            meta.nonHskCount, Date.now(),
        ]
    );
}

export async function getArticleMeta(db: SQLite.SQLiteDatabase, articleId: string): Promise<ArticleMeta | null> {
    const row = await db.getFirstAsync<{
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
        read_count: number;
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
        readCount: row.read_count,
        updatedAt: row.updated_at,
    };
}

export async function getAllArticleMeta(db: SQLite.SQLiteDatabase | null): Promise<Map<string, ArticleMeta>> {
    const result = new Map<string, ArticleMeta>();
    if (!db) return result;

    const rows = await db.getAllAsync<{
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
        read_count: number;
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
            readCount: row.read_count,
            updatedAt: row.updated_at,
        });
    }

    return result;
}

export async function completeReadingSession(db: SQLite.SQLiteDatabase, sessionId: number): Promise<void> {

    const now = Date.now();

// Get session data
    const session = await db.getFirstAsync<{
        characters_displayed: string;
        words_displayed: string;
        familiarity_incremented: boolean;
        article_id: string;
    }>(
        'SELECT characters_displayed, words_displayed, familiarity_incremented, article_id FROM reading_sessions WHERE id = ?',
        [sessionId]
    );

    if (!session) return;

    // ALWAYS increment read count first (before the familiarity guard)
    if (session.article_id) {
        await db.runAsync(
            `INSERT INTO article_meta
             (article_id, total_chars, unique_chars, unknown_chars,
              hsk1_count, hsk2_count, hsk3_count, hsk4_count, hsk5_count, hsk6_count,
              non_hsk_count, read_count, updated_at)
             VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, ?)
             ON CONFLICT(article_id) DO UPDATE SET
               read_count = read_count + 1,
               updated_at = excluded.updated_at`,
            [session.article_id, now]
        );
    }

    // Skip familiarity increment if already done
    if (session.familiarity_incremented) return;

    const characters = session.characters_displayed ? JSON.parse(session.characters_displayed) : [];
    const words = session.words_displayed ? JSON.parse(session.words_displayed) : [];

// Increment character familiarity (capped at 5)
    for (const char of characters) {
        await db.runAsync(
            `UPDATE vocabulary 
             SET familiarity = MIN(familiarity + 1, 5), 
                 is_known = CASE WHEN MIN(familiarity + 1, 5) >= 5 THEN 1 ELSE 0 END, 
                 last_reviewed_at = ?, 
                 total_exposures = (total_exposures + 1),
                 became_known_at = CASE 
                     WHEN is_known = 0 AND MIN(familiarity + 1, 5) >= 5 THEN ? 
                     ELSE became_known_at 
                 END
             WHERE id = ?`,
            [now, now, char]
        );
    }

// Increment word familiarity (capped at 5)
    for (const word of words) {
        await db.runAsync(
            `UPDATE vocabulary 
             SET familiarity = MIN(familiarity + 1, 5), 
                 is_known = CASE WHEN MIN(familiarity + 1, 5) >= 5 THEN 1 ELSE 0 END, 
                 last_reviewed_at = ?, 
                 total_exposures = (total_exposures + 1),
                 became_known_at = CASE 
                     WHEN is_known = 0 AND MIN(familiarity + 1, 5) >= 5 THEN ? 
                     ELSE became_known_at 
                 END
             WHERE id = ?`,
            [now, now, word]
        );
    }

// Mark session as completed
    await db.runAsync(
        'UPDATE reading_sessions SET completed_at = ?, familiarity_incremented = 1 WHERE id = ?',
        [now, sessionId]
    );
}

export async function cancelReadingSession(db: SQLite.SQLiteDatabase, sessionId: number): Promise<void> {

// Just mark as not completed - no familiarity increment
    await db.runAsync(
        'UPDATE reading_sessions SET completed_at = NULL, familiarity_incremented = 0 WHERE id = ?',
        [sessionId]
    );
}

export async function getOverallStats(db: SQLite.SQLiteDatabase): Promise<{
    totalVocabulary: number;
    knownVocabulary: number;
    learningVocabulary: number;
    unknownVocabulary: number;
    totalSessions: number;
    totalLookups: number;
}> {


    const vocabStats = await db.getFirstAsync<{
        total: number;
        known: number;
        learning: number;
        unknown: number;
    }>(`
        SELECT COUNT(*)                                                             as total,
               SUM(CASE WHEN is_known = 1 THEN 1 ELSE 0 END)                        as known,
               SUM(CASE WHEN familiarity > 0 AND familiarity < 5 THEN 1 ELSE 0 END) as learning,
               SUM(CASE WHEN familiarity = 0 THEN 1 ELSE 0 END) as unknown
        FROM vocabulary
        where total_exposures > 0
    `);

    const sessionStats = await db.getFirstAsync<{ total: number }>(
        'SELECT COUNT(*) as total FROM reading_sessions'
    );

    const lookupStats = await db.getFirstAsync<{ total: number }>(
        'SELECT COUNT(*) as total FROM word_lookup_log'
    );

    return {
        totalVocabulary: vocabStats?.total || 0,
        knownVocabulary: vocabStats?.known || 0,
        learningVocabulary: vocabStats?.learning || 0,
        unknownVocabulary: vocabStats?.unknown || 0,
        totalSessions: sessionStats?.total || 0,
        totalLookups: lookupStats?.total || 0,
    };
}