/**
 * Database schema definitions
 * All CREATE TABLE statements and schema versions
 */

/**
 * bump version when making breaking changes to the schema
 */
export const SCHEMA_VERSIONS = {
  CHARACTER_RECOGNITION: 4,
} as const;

// Character Recognition Database Schema
export const CHARACTER_RECOGNITION_SCHEMA = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS vocabulary (
    id TEXT PRIMARY KEY,
    hsk_level INTEGER,
    familiarity INTEGER DEFAULT 0,
    is_known BOOLEAN DEFAULT 0,
    first_seen_at INTEGER,
    last_reviewed_at INTEGER,
    lookup_count INTEGER DEFAULT 0,
    article_count INTEGER DEFAULT 0,
    total_exposures INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_vocabulary_hsk ON vocabulary(hsk_level);
  CREATE INDEX IF NOT EXISTS idx_vocabulary_familiarity ON vocabulary(familiarity);
  CREATE INDEX IF NOT EXISTS idx_vocabulary_is_known ON vocabulary(is_known);

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
    FOREIGN KEY (character) REFERENCES vocabulary(id),
    FOREIGN KEY (session_id) REFERENCES reading_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS word_lookup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    article_id TEXT NOT NULL,
    session_id INTEGER,
    looked_up_at INTEGER,
    character_count INTEGER,
    FOREIGN KEY (word) REFERENCES vocabulary(id),
    FOREIGN KEY (session_id) REFERENCES reading_sessions(id)
  );

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

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS vocabulary_tags (
    vocabulary_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (vocabulary_id, tag_id),
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_vocabulary_tags_vocab ON vocabulary_tags(vocabulary_id);
  CREATE INDEX IF NOT EXISTS idx_vocabulary_tags_tag ON vocabulary_tags(tag_id);

  INSERT OR IGNORE INTO tags (name, description) VALUES 
    ('HSK1', 'HSK Level 1'),
    ('HSK2', 'HSK Level 2'),
    ('HSK3', 'HSK Level 3'),
    ('HSK4', 'HSK Level 4'),
    ('HSK5', 'HSK Level 5'),
    ('HSK6', 'HSK Level 6'),
    ('beginner', 'Beginner level (HSK1)'),
    ('simple', 'Simple level (HSK1-2)'),
    ('advanced', 'Advanced level (HSK3-4)'),
    ('expert', 'Expert level (HSK5-6)'),
    ('learning', 'Currently learning');

  -- Dictionary tables (merged from dictionary.db)
  CREATE TABLE IF NOT EXISTS dictionary_entries (
    simplified TEXT PRIMARY KEY,
    pinyin TEXT NOT NULL,
    definitions TEXT NOT NULL,
    hsk_level INTEGER
  );

  CREATE TABLE IF NOT EXISTS example_sentences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    chinese TEXT NOT NULL,
    pinyin TEXT,
    english TEXT NOT NULL,
    difficulty INTEGER DEFAULT 2
  );

  CREATE INDEX IF NOT EXISTS idx_dictionary_entries_hsk ON dictionary_entries(hsk_level);
  CREATE INDEX IF NOT EXISTS idx_examples_word ON example_sentences(word);
  CREATE INDEX IF NOT EXISTS idx_examples_difficulty ON example_sentences(difficulty);
`;

