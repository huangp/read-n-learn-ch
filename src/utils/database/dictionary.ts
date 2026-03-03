import {DictionaryEntry, RawEntry} from "../../data/dictionary";
import * as SQLite from "expo-sqlite";
import {getDatabase, openDatabase} from "./connection";
import {DB_NAMES} from "./types";
import {LRUCache} from "../lruCache";
import {ExampleSentence} from "../../types";
import {executeBatch} from "./queries";
import {DROP_DICTIONARY_TABLES} from "./schema";

const CACHE_SIZE = 2000;

// Interface for examples coming from JSON file
interface JSONExampleSentence {
  word: string;
  chinese: string;
  pinyin: string | null;
  english: string;
  difficulty: number;
}

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

/**
 * TODO Generate pinyin for Chinese text using simple character mapping
 * This is a lightweight implementation - consider using pinyin library for production
 */
function generatePinyin(chinese: string): string {
    // For now, return empty string - pinyin can be added later
    // In production, you'd use a library like 'pinyin' to generate this
    return '';
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

    async insertExampleSentences(examples: JSONExampleSentence[]): Promise<void> {
        if (!this.db || examples.length === 0) return;

        // Group examples by word, keeping max 3 per word
        const examplesByWord = new Map<string, Array<{chinese: string, english: string, difficulty: number}>>();
        
        for (const ex of examples) {
            if (!examplesByWord.has(ex.word)) {
                examplesByWord.set(ex.word, []);
            }
            
            const wordExamples = examplesByWord.get(ex.word)!;
            if (wordExamples.length < 3) {
                wordExamples.push({
                    chinese: ex.chinese,
                    english: ex.english,
                    difficulty: ex.difficulty
                });
            }
        }

        // Insert grouped examples as JSON
        const BATCH = 500;
        const wordEntries = Array.from(examplesByWord.entries());
        
        for (let i = 0; i < wordEntries.length; i += BATCH) {
            const chunk = wordEntries.slice(i, i + BATCH);
            
            for (const [word, sentences] of chunk) {
                const sentencesJson = JSON.stringify(sentences);
                await this.db.runAsync(
                    `INSERT OR REPLACE INTO example_sentences (word, sentences) VALUES (?, ?)`,
                    [word, sentencesJson]
                );
            }
        }
        
        console.log(`[dict] Inserted ${examplesByWord.size} words with example sentences`);
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
            const row = await this.db.getFirstAsync<{
                sentences: string;
            }>(
                'SELECT sentences FROM example_sentences WHERE word = ?',
                [word]
            );

            if (!row) {
                this.examplesCache.set(word, []);
                return [];
            }

            // Parse JSON and generate pinyin on-the-fly
            const sentences: Array<{chinese: string, english: string, difficulty: number}> = JSON.parse(row.sentences);
            
            const examples: ExampleSentence[] = sentences
                .slice(0, limit)
                .map(sentence => ({
                    chinese: sentence.chinese,
                    english: sentence.english,
                    difficulty: sentence.difficulty,
                    pinyin: generatePinyin(sentence.chinese)
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

    async dropDictTables(): Promise<void> {
        try {
            await executeBatch(DB_NAMES.CHARACTER_RECOGNITION, DROP_DICTIONARY_TABLES);
        } catch (error) {
            console.warn('[dict] Failed to drop old dictionary tables:', error);
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
