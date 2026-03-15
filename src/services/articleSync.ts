import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from '../api/client';
import { StorageService } from './storage';
import { SubscriptionManager } from './subscription/SubscriptionManager';
import { segmentArticle } from './segmentation';
import type { Article } from '../types';

const LAST_SYNC_KEY = '@last_article_sync';
const SYNC_INTERVAL_DAYS = 7;

export interface SyncResult {
  success: boolean;
  newArticlesCount: number;
  message: string;
  error?: string;
}

export class ArticleSyncService {
  /**
   * Get the last sync timestamp
   */
  static async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return timestamp ? new Date(parseInt(timestamp, 10)) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set the last sync timestamp
   */
  static async setLastSyncTime(date: Date): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, date.getTime().toString());
    } catch (error) {
      console.error('Error saving sync time:', error);
    }
  }

  /**
   * Check if sync is needed (more than 7 days since last sync)
   */
  static async isSyncNeeded(): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const now = new Date();
    const diffTime = now.getTime() - lastSync.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays >= SYNC_INTERVAL_DAYS;
  }

  /**
   * Get the number of days since last sync
   */
  static async getDaysSinceLastSync(): Promise<number | null> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return null;

    const now = new Date();
    const diffTime = now.getTime() - lastSync.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Sync articles from cloud
   */
  static async syncArticles(): Promise<SyncResult> {
    try {
      // Check subscription
      const hasAccess = await SubscriptionManager.hasCloudAccess();
      if (!hasAccess) {
        return {
          success: false,
          newArticlesCount: 0,
          message: 'Subscribe to sync articles',
          error: 'No cloud access'
        };
      }

      // Get remote objects
      const remoteObjects = await ApiClient.listObjects();
      const remoteKeys = (remoteObjects.objects || [])
        .map(obj => obj.key)
        .filter((key): key is string => !!key);

      // Get local articles
      const localArticles = await StorageService.getAllArticles();
      const localKeys = localArticles.map(article => article.id);

      // Find missing articles
      const missingKeys = remoteKeys.filter(key => !localKeys.includes(key));

      if (missingKeys.length === 0) {
        await this.setLastSyncTime(new Date());
        return {
          success: true,
          newArticlesCount: 0,
          message: 'No new articles available'
        };
      }

      // Download missing articles
      let downloadedCount = 0;
      const errors: string[] = [];

      for (const key of missingKeys) {
        try {
          const remoteArticle = await ApiClient.getObject(key);
          
          if (remoteArticle.title && remoteArticle.body) {
            // Segment the article
            const segments = await segmentArticle(remoteArticle.body);

            // Create article object
            const article: Article = {
              id: key,
              title: remoteArticle.title,
              content: remoteArticle.body,
              segments,
              wordCount: segments.filter(s => s.type === 'chinese').length,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            // Save article
            await StorageService.saveArticle({
              title: article.title,
              content: article.content,
            }, key);

            downloadedCount++;
          }
        } catch (error) {
          console.error(`Error downloading article ${key}:`, error);
          errors.push(key);
        }
      }

      // Update last sync time
      await this.setLastSyncTime(new Date());

      if (errors.length > 0) {
        return {
          success: true,
          newArticlesCount: downloadedCount,
          message: `Downloaded ${downloadedCount} articles (${errors.length} failed)`,
          error: `Failed to download: ${errors.join(', ')}`
        };
      }

      return {
        success: true,
        newArticlesCount: downloadedCount,
        message: `${downloadedCount} new articles downloaded`
      };

    } catch (error) {
      console.error('Article sync failed:', error);
      return {
        success: false,
        newArticlesCount: 0,
        message: 'Sync failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
