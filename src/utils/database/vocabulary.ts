import * as SQLite from "expo-sqlite";
import {DB_NAMES, getDatabase, openDatabase} from "./connection";
import {LRUCache} from "../lruCache";
import {Tag} from "./types";

export class VocabularyDBUtils {
    private db: SQLite.SQLiteDatabase;
    private vocabularyByTagCache = new LRUCache<number, string[]>(50);

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
     }

    static async create(): Promise<VocabularyDBUtils> {
        let db = getDatabase(DB_NAMES.CHARACTER_RECOGNITION);
        if (!db) {
            db = await openDatabase(DB_NAMES.CHARACTER_RECOGNITION);
        }
        return new VocabularyDBUtils(db);
    }

    /**
     * Decrease familiarity of a vocabulary item and its characters when looked up.
     * @param vocabulary
     */
    async decreaseFamiliarity(vocabulary: string): Promise<void> {
        // Decrease word familiarity (min 0)
        await this.db.runAsync(
            'UPDATE vocabulary SET familiarity = MAX(0, familiarity - 1), lookup_count = lookup_count + 1, is_known = 0 WHERE id = ?',
            [vocabulary]
        );

        // Decrease character familiarity (min 0)
        if (vocabulary.length > 1) {
            for (const char of vocabulary) {
                await this.db.runAsync(
                    'UPDATE vocabulary SET familiarity = MAX(0, familiarity - 1), lookup_count = lookup_count + 1, is_known = 0 WHERE id = ?',
                    [char]
                );
            }
        }
    }

    /**
     * Log a word lookup event for analytics and spaced repetition purposes.
     * @param word
     * @param articleId
     * @param sessionId
     */
    async logWordLookup(word: string, articleId: string, sessionId: number): Promise<void> {
        await this.db.runAsync(
          'INSERT INTO word_lookup_log (word, article_id, session_id, looked_up_at, character_count) VALUES (?, ?, ?, ?, ?)',
          [word, articleId, sessionId, Date.now(), word.length]
        );
    }

    /**
     * Get known/unknown status for a list of vocabulary items.
     * @param words
     */
    async getVocabularyKnownStatus(words: string[]): Promise<Map<string, boolean>> {
        const result = new Map<string, boolean>();
        if (!this.db || words.length === 0) return result;

        // SQLite has a limit on query params, process in chunks
        const chunkSize = 500;
        for (let i = 0; i < words.length; i += chunkSize) {
            const chunk = words.slice(i, i + chunkSize);
            const placeholders = chunk.map(() => '?').join(',');

            const rows = await this.db.getAllAsync<{ id: string; is_known: number }>(
                `SELECT id, is_known FROM vocabulary WHERE id IN (${placeholders})`,
                chunk
            );

            for (const row of rows) {
                result.set(row.id, row.is_known === 1);
            }
        }


        return result;
    }

    async addTagToVocabulary(vocabularyId: string, tagId: number): Promise<boolean> {
        if (!this.db) return false;
        try {
            await this.db.runAsync(
                'INSERT OR IGNORE INTO vocabulary_tags (vocabulary_id, tag_id) VALUES (?, ?)',
                [vocabularyId, tagId]
            );
            // Invalidate cache for this tag since vocabulary was added
            this.vocabularyByTagCache.delete(tagId);
            return true;
        } catch (error) {
            console.error('Error adding tag to vocabulary:', error);
            return false;
        }
    }

    async removeTagFromVocabulary(vocabularyId: string, tagId: number): Promise<boolean> {
        if (!this.db) return false;
        try {
            await this.db.runAsync(
                'DELETE FROM vocabulary_tags WHERE vocabulary_id = ? AND tag_id = ?',
                [vocabularyId, tagId]
            );
            // Invalidate cache for this tag since vocabulary was removed
            // TODO: Also invalidate when vocabulary deletion is implemented
            this.vocabularyByTagCache.delete(tagId);
            return true;
        } catch (error) {
            console.error('Error removing tag from vocabulary:', error);
            return false;
        }
    }

    async getVocabularyByTag(tagId: number): Promise<string[]> {
        // Check cache first
        const cached = this.vocabularyByTagCache.get(tagId);
        if (cached !== undefined) {
            return cached;
        }

        if (!this.db) return [];
        const rows = await this.db.getAllAsync<{ vocabulary_id: string }>(
            'SELECT vocabulary_id FROM vocabulary_tags WHERE tag_id = ? ORDER BY vocabulary_id',
            [tagId]
        );
        const result = rows.map(r => r.vocabulary_id);

        // Cache the result
        this.vocabularyByTagCache.set(tagId, result);

        return result;
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
                // Re-add "learning" tag since it's no longer known
                this.autoTagVocabularyAsLearning(word).catch(err =>
                    console.warn('[Learning] Failed to re-tag word:', word, err)
                );
                return false; // now unknown
            } else {
                // Mark as known: set to 5
                await this.db.runAsync(
                    'UPDATE word_stats SET familiarity = 5, is_known = 1, last_reviewed_at = ? WHERE word = ?',
                    [now, word]
                );
                // Remove "learning" tag since it's now known
                this.removeLearningTag(word).catch(err =>
                    console.warn('[Learning] Failed to remove tag from word:', word, err)
                );
                return true; // now known
            }
        } else {
            // Not in stats yet — insert as known
            await this.db.runAsync(
                'INSERT INTO word_stats (word, familiarity, is_known, first_seen_at, last_reviewed_at, total_exposures, character_count) VALUES (?, 5, 1, ?, ?, 0, ?)',
                [word, now, now, word.length]
            );
            // Word is known, no "learning" tag needed
            return true; // now known
        }
    }

    /**
     * Automatically tag vocabulary as "learning" when looked up.
     * Called when a user looks up a word during reading.
     */
    async autoTagVocabularyAsLearning(vocabularyId: string): Promise<void> {
        if (!this.db) return;

        const tag = await this.getTagByName('learning');
        if (tag) {
            await this.addTagToVocabulary(vocabularyId, tag.id);
        }
    }

    /**
     * Remove the "learning" tag from vocabulary.
     * Called when a word is marked as known (familiarity = 5).
     */
    async removeLearningTag(vocabularyId: string): Promise<void> {
        if (!this.db) return;

        const tag = await this.getTagByName('learning');
        if (tag) {
            await this.removeTagFromVocabulary(vocabularyId, tag.id);
        }
    }

    async getTagByName(name: string): Promise<Tag | null> {
        if (!this.db) return null;
        return await this.db.getFirstAsync<Tag>(
            'SELECT id, name, description, color FROM tags WHERE name = ?',
            [name]
        );
    }

    async getAllTags(): Promise<Tag[]> {
        if (!this.db) {
            console.warn("[Tags] getAllTags called but DB is not available");
            return [];
        }
        return await this.db.getAllAsync<Tag>(
            'SELECT id, name, description, color FROM tags ORDER BY name'
        );
    }
}