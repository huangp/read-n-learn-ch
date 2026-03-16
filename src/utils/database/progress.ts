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

    /**
     * Get reading streak - consecutive days with completed reading sessions
     * Returns current streak and longest streak
     */
    async getReadingStreak(): Promise<ReadingStreak> {
        // Get all dates with completed reading sessions, ordered by date desc
        const rows = await this.db.getAllAsync<{
            date: string;
        }>(
            `SELECT DISTINCT 
                DATE(completed_at / 1000, 'unixepoch', 'localtime') as date
             FROM reading_sessions 
             WHERE completed_at IS NOT NULL
             ORDER BY date DESC`
        );

        const dates = rows.map(r => r.date);
        
        if (dates.length === 0) {
            return { currentStreak: 0, longestStreak: 0 };
        }

        // Calculate current streak (consecutive days from today backward)
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        // Check if read today
        const readToday = dates.includes(todayStr);
        
        // Start counting from today or yesterday
        let checkDate = new Date(today);
        if (!readToday) {
            // If didn't read today, check if read yesterday to maintain streak
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        // Count consecutive days
        for (let i = 0; i < dates.length; i++) {
            const checkDateStr = checkDate.toISOString().split('T')[0];
            if (dates.includes(checkDateStr)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 1;
        
        for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(dates[i - 1]);
            const currDate = new Date(dates[i]);
            const diffDays = (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (diffDays === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        return { currentStreak, longestStreak };
    }

    /**
     * Get badge progress and unlock status
     */
    async getBadgeProgress(): Promise<BadgeProgress[]> {
        // Get current stats for badge calculations
        const [articlesRead, vocabularyKnown] = await Promise.all([
            this.db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM reading_sessions WHERE completed_at IS NOT NULL`
            ),
            this.db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM vocabulary WHERE is_known = 1`
            ),
        ]);

        const articlesCount = articlesRead?.count || 0;
        const vocabCount = vocabularyKnown?.count || 0;

        // Get streak
        const streak = await this.getReadingStreak();

        // Define badges with criteria
        const badges: BadgeProgress[] = [
            {
                id: 'first_steps',
                name: '🏃‍♂️ First Steps',
                description: 'Read your first article',
                criteria: 'Read 1 article',
                target: 1,
                current: articlesCount,
                isUnlocked: articlesCount >= 1,
            },
            {
                id: 'bookworm',
                name: '📚 Bookworm',
                description: 'Read 10 articles',
                criteria: 'Read 10 articles',
                target: 10,
                current: articlesCount,
                isUnlocked: articlesCount >= 10,
            },
            {
                id: 'reading_master',
                name: '📖 Reading Master',
                description: 'Read 50 articles',
                criteria: 'Read 50 articles',
                target: 50,
                current: articlesCount,
                isUnlocked: articlesCount >= 50,
            },
            {
                id: 'vocabulary_builder',
                name: '🧠 Vocabulary Builder',
                description: 'Learn 500 vocabulary items',
                criteria: 'Learn 500 vocabulary items',
                target: 500,
                current: vocabCount,
                isUnlocked: vocabCount >= 500,
            },
            {
                id: 'vocabulary_master',
                name: '🎓 Vocabulary Master',
                description: 'Learn 2000 vocabulary items',
                criteria: 'Learn 2000 vocabulary items',
                target: 2000,
                current: vocabCount,
                isUnlocked: vocabCount >= 2000,
            },
            {
                id: 'on_fire',
                name: '🔥 On Fire',
                description: 'Maintain a 7-day reading streak',
                criteria: '7-day streak',
                target: 7,
                current: streak.currentStreak,
                isUnlocked: streak.currentStreak >= 7,
            },
            {
                id: 'daily_dedication',
                name: '💪 Daily Dedication',
                description: 'Maintain a 30-day reading streak',
                criteria: '30-day streak',
                target: 30,
                current: streak.currentStreak,
                isUnlocked: streak.currentStreak >= 30,
            },
        ];

        // Get HSK progress for HSK badges
        const hskProgress = await this.getHSKProgress();

        // Add HSK level badges
        const hskBadges: BadgeProgress[] = hskProgress.map((hsk, index) => {
            const level = index + 1;
            const percentage = hsk.total > 0 ? Math.round((hsk.known / hsk.total) * 100) : 0;
            const medals = ['🥇', '🥈', '🥉', '🏅', '🎖️', '👑'];
            return {
                id: `hsk_${level}`,
                name: `${medals[index]} HSK ${level} Master`,
                description: `Master all HSK ${level} vocabulary`,
                criteria: `Master 100% of HSK ${level}`,
                target: 100,
                current: percentage,
                isUnlocked: percentage >= 100,
            };
        });

        // Combine all badges
        const allBadges = [...badges, ...hskBadges];

        // Persist unlock status to database
        for (const badge of allBadges) {
            if (badge.isUnlocked) {
                await this.db.runAsync(
                    `INSERT OR IGNORE INTO user_badges (badge_id, unlocked_at, is_unlocked) 
                     VALUES (?, ?, 1)`,
                    [badge.id, Date.now()]
                );
            }
        }

        // Sort: unlocked first, then by ID
        return allBadges.sort((a, b) => {
            if (a.isUnlocked && !b.isUnlocked) return -1;
            if (!a.isUnlocked && b.isUnlocked) return 1;
            return a.id.localeCompare(b.id);
        });
    }

    /**
     * Get HSK level progress
     */
    async getHSKProgress(): Promise<HSKLevelProgress[]> {
        const hskLevels: HSKLevelProgress[] = [];

        for (let level = 1; level <= 6; level++) {
            // Get total vocabulary for this HSK level from dictionary
            const totalResult = await this.db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM dictionary_entries WHERE hsk_level = ?`,
                [level]
            );

            // Get known vocabulary for this HSK level
            const knownResult = await this.db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count 
                 FROM vocabulary v
                 JOIN dictionary_entries d ON v.id = d.simplified
                 WHERE d.hsk_level = ? AND v.is_known = 1`,
                [level]
            );

            hskLevels.push({
                level,
                total: totalResult?.count || 0,
                known: knownResult?.count || 0,
            });
        }

        return hskLevels;
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

export interface ReadingStreak {
    currentStreak: number;
    longestStreak: number;
}

export interface BadgeProgress {
    id: string;
    name: string;
    description: string;
    criteria: string;
    target: number;
    current: number;
    isUnlocked: boolean;
}

export interface HSKLevelProgress {
    level: number;
    total: number;
    known: number;
}
