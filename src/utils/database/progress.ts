import * as SQLite from "expo-sqlite";
import {DB_NAMES, getDatabase, openDatabase} from "./connection";

export interface VocabularyForReview {
    id: string;
    lookup_count: number;
}

export interface ProblemWord {
    id: string;
    lookup_count: number;
}

export class ProgressDBUtils {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    static async create(): Promise<ProgressDBUtils> {
        let db = getDatabase(DB_NAMES.CHARACTER_RECOGNITION);
        if (!db) {
            db = await openDatabase(DB_NAMES.CHARACTER_RECOGNITION);
        }
        return new ProgressDBUtils(db);
    }

    /**
     * Get words for review - words that have been looked up and have familiarity < 5
     * Ordered by lookup_count DESC (most looked up first), then by last_reviewed_at ASC
     */
    async getWordsForReview(limit: number = 20): Promise<VocabularyForReview[]> {
        const rows = await this.db.getAllAsync<{
            id: string;
            lookup_count: number;
        }>(
            `SELECT id, lookup_count 
             FROM vocabulary 
             WHERE lookup_count > 0 AND familiarity < 5 AND is_known = 0
             ORDER BY lookup_count DESC, last_reviewed_at ASC
             LIMIT ?`,
            [limit]
        );

        return rows;
    }

    /**
     * Get problem words - words with highest lookup counts
     * Ordered by lookup_count DESC
     */
    async getProblemWords(limit: number = 20): Promise<ProblemWord[]> {
        const rows = await this.db.getAllAsync<{
            id: string;
            lookup_count: number;
        }>(
            `SELECT id, lookup_count 
             FROM vocabulary 
             WHERE lookup_count > 0
             ORDER BY lookup_count DESC
             LIMIT ?`,
            [limit]
        );

        return rows;
    }

    /**
     * Get daily learning statistics for a date range
     * Returns stats for each day: vocabulary known, articles read, vocabulary exposed
     */
    async getDailyStats(startDate: number, endDate: number): Promise<DailyStats[]> {
        // Get vocabulary that became known each day (using localtime for timezone correction)
        const vocabularyKnownRows = await this.db.getAllAsync<{
            date: string;
            count: number;
        }>(
            `SELECT 
                DATE(became_known_at / 1000, 'unixepoch', 'localtime') as date,
                COUNT(*) as count
             FROM vocabulary 
             WHERE became_known_at >= ? AND became_known_at <= ?
             GROUP BY DATE(became_known_at / 1000, 'unixepoch', 'localtime')`,
            [startDate, endDate]
        );

        // Get articles read each day (using localtime for timezone correction)
        const articlesReadRows = await this.db.getAllAsync<{
            date: string;
            count: number;
        }>(
            `SELECT 
                DATE(completed_at / 1000, 'unixepoch', 'localtime') as date,
                COUNT(*) as count
             FROM reading_sessions 
             WHERE completed_at IS NOT NULL 
               AND completed_at >= ? AND completed_at <= ?
             GROUP BY DATE(completed_at / 1000, 'unixepoch', 'localtime')`,
            [startDate, endDate]
        );

        // Get vocabulary exposed each day (using localtime for timezone correction)
        const vocabularyExposedRows = await this.db.getAllAsync<{
            date: string;
            total_vocab: number;
        }>(
            `SELECT 
                DATE(completed_at / 1000, 'unixepoch', 'localtime') as date,
                SUM(
                    CASE 
                        WHEN characters_displayed IS NULL OR characters_displayed = '' THEN 0
                        WHEN characters_displayed = '[]' THEN 0
                        ELSE (
                            LENGTH(characters_displayed) - 
                            LENGTH(REPLACE(characters_displayed, ',', '')) + 1
                        )
                    END
                ) as total_vocab
             FROM reading_sessions 
             WHERE completed_at IS NOT NULL 
               AND completed_at >= ? AND completed_at <= ?
             GROUP BY DATE(completed_at / 1000, 'unixepoch', 'localtime')`,
            [startDate, endDate]
        );

        // Create a map of all dates in range
        const statsMap = new Map<string, DailyStats>();
        
        // Initialize all dates in range with zeros (using local timezone)
        const currentDate = new Date(startDate);
        const end = new Date(endDate);
        while (currentDate <= end) {
            // Format date as YYYY-MM-DD in local timezone
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            statsMap.set(dateStr, {
                date: dateStr,
                vocabularyKnown: 0,
                articlesRead: 0,
                vocabularyExposed: 0,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Fill in the data
        for (const row of vocabularyKnownRows) {
            const stats = statsMap.get(row.date);
            if (stats) {
                stats.vocabularyKnown = row.count;
            }
        }

        for (const row of articlesReadRows) {
            const stats = statsMap.get(row.date);
            if (stats) {
                stats.articlesRead = row.count;
            }
        }

        for (const row of vocabularyExposedRows) {
            const stats = statsMap.get(row.date);
            if (stats) {
                stats.vocabularyExposed = row.total_vocab || 0;
            }
        }

        // Convert map to array and sort by date
        return Array.from(statsMap.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
        );
    }

    /**
     * Get overall learning statistics (lifetime totals)
     */
    async getOverallLearningStats(): Promise<OverallLearningStats> {
        // Get total vocabulary exposed across all sessions
        // This counts duplicates across sessions (sum of all characters_displayed arrays)
        const vocabExposedResult = await this.db.getFirstAsync<{
            total_vocab: number;
        }>(
            `SELECT
                SUM(
                    CASE
                        WHEN characters_displayed IS NULL OR characters_displayed = '' THEN 0
                        WHEN characters_displayed = '[]' THEN 0
                        ELSE (
                            LENGTH(characters_displayed) -
                            LENGTH(REPLACE(characters_displayed, ',', '')) + 1
                        )
                    END
                ) as total_vocab
             FROM reading_sessions
             WHERE completed_at IS NOT NULL`
        );

        // Get total vocabulary known (is_known = 1)
        const vocabularyKnownResult = await this.db.getFirstAsync<{
            total_known: number;
        }>(
            `SELECT COUNT(*) as total_known
             FROM vocabulary
             WHERE is_known = 1`
        );

        // Get total articles read (completed reading sessions)
        const articlesResult = await this.db.getFirstAsync<{
            total_articles: number;
        }>(
            `SELECT COUNT(*) as total_articles
             FROM reading_sessions
             WHERE completed_at IS NOT NULL`
        );

        return {
            totalVocabularyExposed: vocabExposedResult?.total_vocab || 0,
            totalVocabularyKnown: vocabularyKnownResult?.total_known || 0,
            totalArticlesRead: articlesResult?.total_articles || 0,
        };
    }
}

export interface DailyStats {
    date: string;
    vocabularyKnown: number;
    articlesRead: number;
    vocabularyExposed: number;
}

export interface OverallLearningStats {
    totalVocabularyExposed: number;
    totalVocabularyKnown: number;
    totalArticlesRead: number;
}
