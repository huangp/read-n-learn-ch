import {DictionaryEntry, RawEntry} from "../../data/dictionary";
import * as SQLite from "expo-sqlite";
import {getDatabase, openDatabase} from "./connection";
import {DB_NAMES} from "./types";
import {LRUCache} from "../lruCache";
import {ExampleSentence} from "../../types";

const CACHE_SIZE = 2000;

function rowToEntry(row: {
    simplified: string;
    pinyin: string;
    definitions: string;
    hsk_level: number | null;
}): DictionaryEntry {
    return {
        simplified: row.simplified,
        pinyin: row.pinyin,
        definitions: JSON.parse(row.definitions),
        pos: '',
        hskLevel: row.hsk_level ?? undefined,
        examples: [] as ExampleSentence[],
    };
}

export class DictionaryDBUtil {
    private db: SQLite.SQLiteDatabase;
    private dbSync = SQLite.openDatabaseSync(DB_NAMES.CHARACTER_RECOGNITION);
    private cache = new LRUCache<string, DictionaryEntry | null>(CACHE_SIZE);
    private examplesCache = new LRUCache<string, ExampleSentence[]>(CACHE_SIZE);


    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    static async create(): Promise<DictionaryDBUtil> {
        let db = getDatabase(DB_NAMES.CHARACTER_RECOGNITION);
        if (!db) {
            db = await openDatabase(DB_NAMES.CHARACTER_RECOGNITION);
        }
        return new DictionaryDBUtil(db);
    }

    async insertDictionaryEntries(entries: RawEntry[]): Promise<void> {
        if (!this.db || entries.length === 0) return;

        // Use batched inserts for speed
        const BATCH = 500;
        for (let i = 0; i < entries.length; i += BATCH) {
            const chunk = entries.slice(i, i + BATCH);
            const placeholders = chunk.map(() => '(?,?,?,?)').join(',');
            const params: any[] = [];
            for (const e of chunk) {
                params.push(e.s, e.p, JSON.stringify(e.d), e.h ?? null);
            }
            await this.db.runAsync(
                `INSERT OR IGNORE INTO dictionary_entries (simplified, pinyin, definitions, hsk_level) VALUES ${placeholders}`,
                params
            );
        }
    }

    async insertExampleSentences(examples: ExampleSentence[]): Promise<void> {
        if (!this.db || examples.length === 0) return;

        const BATCH = 500;
        // Insert in batches
        for (let i = 0; i < examples.length; i += BATCH) {
            const chunk = examples.slice(i, i + BATCH);
            const placeholders = chunk.map(() => '(?,?,?,?,?)').join(',');
            const params: any[] = [];

            for (const ex of chunk) {
                params.push(ex.word, ex.chinese, ex.pinyin, ex.english, ex.difficulty);
            }

            await this.db.runAsync(
                `INSERT INTO example_sentences (word, chinese, pinyin, english, difficulty) VALUES ${placeholders}`,
                params
            );
        }
    }


    async getExamplesForWord(
        word: string,
        limit: number = 3
    ): Promise<ExampleSentence[]> {
        // Check cache first
        if (this.examplesCache.has(word)) {
            return this.examplesCache.get(word) ?? [];
        }

        if (!this.db) {
            console.warn('[dict] getExamplesForWord called before DB init');
            return [];
        }

        try {
            const rows = await this.db.getAllAsync<{
                id: number;
                word: string;
                chinese: string;
                pinyin: string;
                english: string;
                difficulty: number;
            }>(
                'SELECT id, word, chinese, pinyin, english, difficulty FROM example_sentences WHERE word = ? ORDER BY difficulty ASC LIMIT ?',
                [word, limit]
            );

            const examples: ExampleSentence[] = rows.map(row => ({
                id: row.id,
                word: row.word,
                chinese: row.chinese,
                pinyin: row.pinyin,
                english: row.english,
                difficulty: row.difficulty,
            }));

            this.examplesCache.set(word, examples);
            return examples;
        } catch (error) {
            console.error(`[dict] Error getting examples for ${word}:`, error);
            return [];
        }
    }

    async deleteOldData(): Promise<void> {
        // Clear old data
        try {
            await this.db.execAsync('DELETE FROM dictionary_entries');
            await this.db.execAsync('DELETE FROM example_sentences');
        } catch (error) {
            console.warn('[dict] Failed to clear old dictionary data:', error);
        }
    }

    /**
     * Synchronous lookup using the sync SQLite handle + LRU cache.
     * The cache prevents repeated sync DB calls for the same word.
     */
    searchDictionarySync(word: string): DictionaryEntry | null {
        // Check cache first
        if (this.cache.has(word)) return this.cache.get(word) ?? null;


        const row = this.dbSync.getFirstSync<{
            simplified: string;
            pinyin: string;
            definitions: string;
            hsk_level: number | null;
        }>('SELECT simplified, pinyin, definitions, hsk_level FROM dictionary_entries WHERE simplified = ?', [word]);

        if (row) {
            const entry = rowToEntry(row);
            this.cache.set(word, entry);
            return entry;
        }

        this.cache.set(word, null);
        return null;
    }

    async getAllDictionaryEntries(): Promise<{simplified: string, hsk_level: number}[]> {
        return await this.db.getAllAsync<{ simplified: string; hsk_level: number }>(
            'SELECT simplified, hsk_level FROM dictionary_entries WHERE hsk_level IS NOT NULL ORDER BY hsk_level'
        );
    }
}

