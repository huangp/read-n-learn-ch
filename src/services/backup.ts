import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, DB_NAMES } from '../utils/database/connection';
import { Article } from '../types';
import { VocabularyItem, ArticleMeta } from '../utils/database/types';
import { ApiClient } from '../api/client';
import SubscriptionManager from './subscription/SubscriptionManager';
import * as Updates from 'expo-updates';

export type BackupVocabularyItem = VocabularyItem & {
  becameKnownAt: number | null;
};

export interface BackupVocabularyTag {
  vocabularyId: string;
  tagName: string;
}

export interface BackupUserBadge {
  badgeId: string;
  unlockedAt: number | null;
  progress: number;
  isUnlocked: boolean;
}

const BATCH_SIZE = 20;

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export type ImportProgressStep =
  | 'downloading'
  | 'restoring_vocabulary'
  | 'restoring_article_meta'
  | 'restoring_vocabulary_tags'
  | 'restoring_user_badges'
  | 'restoring_async_storage'
  | 'complete';

export interface ImportProgress {
  step: ImportProgressStep;
  current: number;
  total: number;
  message: string;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  sqlite: {
    vocabulary: BackupVocabularyItem[];
    articleMeta: ArticleMeta[];
    vocabularyTags: BackupVocabularyTag[];
    userBadges: BackupUserBadge[];
  };
  asyncStorage: {
    articles: Article[];
    articleTagsIndex: string[];
    defaultFontSize: string | null;
  };
}

/**
 * Export all user data into a single JSON-serializable backup object.
 * This includes SQLite tables and AsyncStorage keys.
 */
export async function exportBackup(): Promise<BackupData> {
  const db = getDatabase(DB_NAMES.CHARACTER_RECOGNITION);
  if (!db) {
    throw new Error('[Backup] Database not available');
  }

  // SQLite: vocabulary
  const vocabularyRows = await db.getAllAsync<{
    id: string;
    hsk_level: number | null;
    familiarity: number;
    is_known: number;
    first_seen_at: number;
    last_reviewed_at: number;
    lookup_count: number;
    article_count: number;
    total_exposures: number;
    became_known_at: number | null;
  }>('SELECT * FROM vocabulary');

  const vocabulary: BackupVocabularyItem[] = vocabularyRows.map(row => ({
    id: row.id,
    hskLevel: row.hsk_level,
    familiarity: row.familiarity,
    isKnown: row.is_known === 1,
    firstSeenAt: row.first_seen_at,
    lastReviewedAt: row.last_reviewed_at,
    lookupCount: row.lookup_count,
    articleCount: row.article_count,
    totalExposures: row.total_exposures,
    becameKnownAt: row.became_known_at,
  }));

  // SQLite: article_meta
  const articleMetaRows = await db.getAllAsync<{
    article_id: string;
    total_chars: number;
    unique_chars: number;
    unknown_chars: number;
    hsk1_count: number;
    hsk2_count: number;
    hsk3_count: number;
    hsk4_count: number;
    hsk5_count: number;
    hsk6_count: number;
    non_hsk_count: number;
    read_count: number;
    updated_at: number;
  }>('SELECT * FROM article_meta');

  const articleMeta: ArticleMeta[] = articleMetaRows.map(row => ({
    articleId: row.article_id,
    totalChars: row.total_chars,
    uniqueChars: row.unique_chars,
    unknownChars: row.unknown_chars,
    hsk1Count: row.hsk1_count,
    hsk2Count: row.hsk2_count,
    hsk3Count: row.hsk3_count,
    hsk4Count: row.hsk4_count,
    hsk5Count: row.hsk5_count,
    hsk6Count: row.hsk6_count,
    nonHskCount: row.non_hsk_count,
    readCount: row.read_count,
    updatedAt: row.updated_at,
  }));

  // SQLite: vocabulary_tags
  const vocabularyTagsRows = await db.getAllAsync<{
    vocabulary_id: string;
    tag_name: string;
  }>('SELECT * FROM vocabulary_tags');

  const vocabularyTags: BackupVocabularyTag[] = vocabularyTagsRows.map(row => ({
    vocabularyId: row.vocabulary_id,
    tagName: row.tag_name,
  }));

  // SQLite: user_badges
  const userBadgesRows = await db.getAllAsync<{
    badge_id: string;
    unlocked_at: number | null;
    progress: number;
    is_unlocked: number;
  }>('SELECT * FROM user_badges');

  const userBadges: BackupUserBadge[] = userBadgesRows.map(row => ({
    badgeId: row.badge_id,
    unlockedAt: row.unlocked_at,
    progress: row.progress,
    isUnlocked: row.is_unlocked === 1,
  }));

  // AsyncStorage: articles
  const articlesJson = await AsyncStorage.getItem('@articles');
  const articles: Article[] = articlesJson ? JSON.parse(articlesJson) : [];

  // AsyncStorage: article tags index
  const tagsIndexJson = await AsyncStorage.getItem('@article_tags_index');
  const articleTagsIndex: string[] = tagsIndexJson ? JSON.parse(tagsIndexJson) : [];

  // AsyncStorage: default font size
  const defaultFontSize = await AsyncStorage.getItem('@default_font_size');

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    sqlite: {
      vocabulary,
      articleMeta,
      vocabularyTags,
      userBadges,
    },
    asyncStorage: {
      articles,
      articleTagsIndex,
      defaultFontSize,
    },
  };
}

/**
 * Export backup data to cloud storage.
 * Uses RevenueCat App User ID as the user identifier.
 * Requires active subscription (hasCloudAccess).
 */
export async function exportBackupToCloud(): Promise<void> {
  const appUserId = await SubscriptionManager.getAppUserID();
  if (!appUserId) {
    throw new Error('[Backup] RevenueCat App User ID not available');
  }

  const backup = await exportBackup();
  await ApiClient.exportBackup(appUserId, backup as unknown as Record<string, unknown>);
}

/**
 * Import backup data from cloud storage.
 * Uses RevenueCat App User ID as the user identifier.
 * Replaces all local data with cloud backup.
 * Validates backup version before importing.
 * Reloads the app after successful import.
 */
export async function importBackupFromCloud(
  onProgress?: (progress: ImportProgress) => void
): Promise<void> {
  const appUserId = await SubscriptionManager.getAppUserID();
  if (!appUserId) {
    throw new Error('[Backup] RevenueCat App User ID not available');
  }

  onProgress?.({
    step: 'downloading',
    current: 0,
    total: 1,
    message: 'Downloading backup from cloud...',
  });

  const response = await ApiClient.importBackup(appUserId);
  if (!response.backupData) {
    throw new Error('[Backup] No backup data found in cloud');
  }

  const backup = response.backupData as unknown as BackupData;

  // Validate backup version
  if (backup.version !== 1) {
    throw new Error(`[Backup] Unsupported backup version: ${backup.version}. Expected version 1.`);
  }

  const db = getDatabase(DB_NAMES.CHARACTER_RECOGNITION);
  if (!db) {
    throw new Error('[Backup] Database not available');
  }

  // Clear existing user data tables
  await db.runAsync('DELETE FROM vocabulary');
  await db.runAsync('DELETE FROM article_meta');
  await db.runAsync('DELETE FROM vocabulary_tags');
  await db.runAsync('DELETE FROM user_badges');

  // Import vocabulary in batches (transaction per batch)
  const vocabChunks = chunkArray(backup.sqlite.vocabulary, BATCH_SIZE);
  for (let i = 0; i < vocabChunks.length; i++) {
    const chunk = vocabChunks[i];
    onProgress?.({
      step: 'restoring_vocabulary',
      current: Math.min((i + 1) * BATCH_SIZE, backup.sqlite.vocabulary.length),
      total: backup.sqlite.vocabulary.length,
      message: `Restoring vocabulary (${Math.min((i + 1) * BATCH_SIZE, backup.sqlite.vocabulary.length)}/${backup.sqlite.vocabulary.length})...`,
    });

    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const values = chunk.flatMap(item => [
      item.id,
      item.hskLevel,
      item.familiarity,
      item.isKnown ? 1 : 0,
      item.firstSeenAt,
      item.lastReviewedAt,
      item.lookupCount,
      item.articleCount,
      item.totalExposures,
      item.becameKnownAt,
    ]);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO vocabulary (id, hsk_level, familiarity, is_known, first_seen_at, last_reviewed_at, lookup_count, article_count, total_exposures, became_known_at) VALUES ${placeholders}`,
        values
      );
    });
  }

  // Import article_meta in batches (transaction per batch)
  const articleChunks = chunkArray(backup.sqlite.articleMeta, BATCH_SIZE);
  for (let i = 0; i < articleChunks.length; i++) {
    const chunk = articleChunks[i];
    onProgress?.({
      step: 'restoring_article_meta',
      current: Math.min((i + 1) * BATCH_SIZE, backup.sqlite.articleMeta.length),
      total: backup.sqlite.articleMeta.length,
      message: `Restoring article metadata (${Math.min((i + 1) * BATCH_SIZE, backup.sqlite.articleMeta.length)}/${backup.sqlite.articleMeta.length})...`,
    });

    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const values = chunk.flatMap(item => [
      item.articleId,
      item.totalChars,
      item.uniqueChars,
      item.unknownChars,
      item.hsk1Count,
      item.hsk2Count,
      item.hsk3Count,
      item.hsk4Count,
      item.hsk5Count,
      item.hsk6Count,
      item.nonHskCount,
      item.readCount,
      item.updatedAt,
    ]);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO article_meta (article_id, total_chars, unique_chars, unknown_chars, hsk1_count, hsk2_count, hsk3_count, hsk4_count, hsk5_count, hsk6_count, non_hsk_count, read_count, updated_at) VALUES ${placeholders}`,
        values
      );
    });
  }

  // Import vocabulary_tags in batches (transaction per batch)
  const tagChunks = chunkArray(backup.sqlite.vocabularyTags, BATCH_SIZE);
  for (let i = 0; i < tagChunks.length; i++) {
    const chunk = tagChunks[i];
    onProgress?.({
      step: 'restoring_vocabulary_tags',
      current: Math.min((i + 1) * BATCH_SIZE, backup.sqlite.vocabularyTags.length),
      total: backup.sqlite.vocabularyTags.length,
      message: `Restoring vocabulary tags (${Math.min((i + 1) * BATCH_SIZE, backup.sqlite.vocabularyTags.length)}/${backup.sqlite.vocabularyTags.length})...`,
    });

    const placeholders = chunk.map(() => '(?, ?)').join(',');
    const values = chunk.flatMap(item => [item.vocabularyId, item.tagName]);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO vocabulary_tags (vocabulary_id, tag_name) VALUES ${placeholders}`,
        values
      );
    });
  }

  // Import user_badges in batches (transaction per batch)
  const badgeChunks = chunkArray(backup.sqlite.userBadges, BATCH_SIZE);
  for (let i = 0; i < badgeChunks.length; i++) {
    const chunk = badgeChunks[i];
    onProgress?.({
      step: 'restoring_user_badges',
      current: Math.min((i + 1) * BATCH_SIZE, backup.sqlite.userBadges.length),
      total: backup.sqlite.userBadges.length,
      message: `Restoring user badges (${Math.min((i + 1) * BATCH_SIZE, backup.sqlite.userBadges.length)}/${backup.sqlite.userBadges.length})...`,
    });

    const placeholders = chunk.map(() => '(?, ?, ?, ?)').join(',');
    const values = chunk.flatMap(item => [
      item.badgeId,
      item.unlockedAt,
      item.progress,
      item.isUnlocked ? 1 : 0,
    ]);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO user_badges (badge_id, unlocked_at, progress, is_unlocked) VALUES ${placeholders}`,
        values
      );
    });
  }

  onProgress?.({
    step: 'restoring_async_storage',
    current: 1,
    total: 1,
    message: 'Restoring articles and settings...',
  });

  // Restore AsyncStorage data (skip subscription-storage - RevenueCat handles it)
  if (backup.asyncStorage.articles.length > 0) {
    await AsyncStorage.setItem('@articles', JSON.stringify(backup.asyncStorage.articles));
  } else {
    await AsyncStorage.removeItem('@articles');
  }

  if (backup.asyncStorage.articleTagsIndex.length > 0) {
    await AsyncStorage.setItem('@article_tags_index', JSON.stringify(backup.asyncStorage.articleTagsIndex));
  } else {
    await AsyncStorage.removeItem('@article_tags_index');
  }

  if (backup.asyncStorage.defaultFontSize) {
    await AsyncStorage.setItem('@default_font_size', backup.asyncStorage.defaultFontSize);
  } else {
    await AsyncStorage.removeItem('@default_font_size');
  }

  onProgress?.({
    step: 'complete',
    current: 1,
    total: 1,
    message: 'Restore complete!',
  });
}
