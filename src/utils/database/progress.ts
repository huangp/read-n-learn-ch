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
}
