import {ProgressDBUtils} from "../utils/database/progress";

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
}

export const progressService = new ProgressService();
