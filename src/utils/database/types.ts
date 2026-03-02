/**
 * Database types and interfaces
 */

import * as SQLite from 'expo-sqlite';

// Domain types (moved from CharacterRecognitionService)
export interface VocabularyItem {
  id: string;
  hskLevel: number | null;
  familiarity: number;
  isKnown: boolean;
  firstSeenAt: number;
  lastReviewedAt: number;
  lookupCount: number;
  articleCount: number;
  totalExposures: number;
}

export interface ReadingSession {
  id: number;
  articleId: string;
  startedAt: number;
  completedAt?: number;
  charactersDisplayed: string[];
  wordsDisplayed: string[];
  charactersLookedUp: string[];
  wordsLookedUp: string[];
  familiarityIncremented: boolean;
}

export interface ArticleMeta {
  articleId: string;
  totalChars: number;
  uniqueChars: number;
  unknownChars: number;
  hsk1Count: number;
  hsk2Count: number;
  hsk3Count: number;
  hsk4Count: number;
  hsk5Count: number;
  hsk6Count: number;
  nonHskCount: number;
  updatedAt: number;
}

export interface Tag {
  id: number;
  name: string;
  description?: string;
  color?: string;
}

export interface CharacterTag {
  character: string;
  tagId: number;
}

// Database error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONNECTION_ERROR', originalError);
    this.name = 'ConnectionError';
  }
}

export class QueryError extends DatabaseError {
  constructor(
    message: string,
    public readonly sql: string,
    originalError?: Error
  ) {
    super(message, 'QUERY_ERROR', originalError);
    this.name = 'QueryError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'TRANSACTION_ERROR', originalError);
    this.name = 'TransactionError';
  }
}

// Database names
export const DB_NAMES = {
  CHARACTER_RECOGNITION: 'character_recognition.db',
  DICTIONARY: 'dictionary.db',
} as const;

export type DatabaseName = typeof DB_NAMES[keyof typeof DB_NAMES];

// Connection state
export interface DBConnection {
  name: DatabaseName;
  db: SQLite.SQLiteDatabase | null;
  syncDb: SQLite.SQLiteDatabase | null;
  version: number;
}

// Transaction callback
export type TransactionCallback<T> = (db: SQLite.SQLiteDatabase) => Promise<T>;

// Query result wrapper
export interface QueryResult<T = any> {
  data: T[];
  rowCount: number;
  lastInsertRowId?: number;
}
