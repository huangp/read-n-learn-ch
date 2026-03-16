import {ProgressDBUtils, DailyStats, OverallLearningStats, ReadingStreak, BadgeProgress} from "../utils/database/progress";

export type { BadgeProgress };

export interface VocabularyItem {
    word: string;
    lookupCount: number;
}

class ProgressService {
    private dbUtils: ProgressDBUtils | null = null;

    async init(): Promise<void> {
        if (!this.dbUtils) {
            this.dbUtils = await ProgressDBUtils.create();
        }
    }

    /**
     * Get words for review
     */
    async getWordsForReview(limit: number = 20): Promise<VocabularyItem[]> {
        await this.init();
        if (!this.dbUtils) return [];

        const words = await this.dbUtils.getWordsForReview(limit);
        return words.map(word => ({
            word: word.id,
            lookupCount: word.lookup_count,
        }));
    }

    /**
     * Get problem words
     */
    async getProblemWords(limit: number = 20): Promise<VocabularyItem[]> {
        await this.init();
        if (!this.dbUtils) return [];

        const words = await this.dbUtils.getProblemWords(limit);
        return words.map(word => ({
            word: word.id,
            lookupCount: word.lookup_count,
        }));
    }

    /**
     * Get daily learning statistics for a date range
     */
    async getDailyStats(startDate: number, endDate: number): Promise<DailyStats[]> {
        await this.init();
        if (!this.dbUtils) return [];

        return await this.dbUtils.getDailyStats(startDate, endDate);
    }

    /**
     * Get overall learning statistics (lifetime totals)
     */
    async getOverallLearningStats(): Promise<OverallLearningStats> {
        await this.init();
        if (!this.dbUtils) {
            return {
                totalVocabularyExposed: 0,
                totalVocabularyKnown: 0,
                totalArticlesRead: 0,
            };
        }

        return await this.dbUtils.getOverallLearningStats();
    }

    /**
     * Get reading streak statistics
     */
    async getReadingStreak(): Promise<ReadingStreak> {
        await this.init();
        if (!this.dbUtils) {
            return { currentStreak: 0, longestStreak: 0 };
        }

        return await this.dbUtils.getReadingStreak();
    }

    /**
     * Get badge progress and unlock status
     */
    async getBadgeProgress(): Promise<BadgeProgress[]> {
        await this.init();
        if (!this.dbUtils) return [];

        return await this.dbUtils.getBadgeProgress();
    }
}

export const progressService = new ProgressService();
