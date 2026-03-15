import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './storage';

const TAGS_INDEX_KEY = '@article_tags_index';

/**
 * Service for managing article tags index
 * Maintains a global index of all unique tags across all articles for efficient lookup
 */
export class ArticleTagsService {
  /**
   * Get all unique tags from the index
   */
  static async getAllTags(): Promise<string[]> {
    try {
      const indexJson = await AsyncStorage.getItem(TAGS_INDEX_KEY);
      if (indexJson) {
        const tags = JSON.parse(indexJson);
        return Array.isArray(tags) ? tags : [];
      }
    } catch (error) {
      console.error('[ArticleTagsService] Error loading tags index:', error);
    }
    return [];
  }

  /**
   * Add tags to the global index
   */
  static async addTagsToIndex(tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return;
    
    try {
      const currentTags = await this.getAllTags();
      const tagSet = new Set([...currentTags, ...tags.map(t => t.toLowerCase().trim())]);
      const updatedTags = Array.from(tagSet).sort();
      await AsyncStorage.setItem(TAGS_INDEX_KEY, JSON.stringify(updatedTags));
    } catch (error) {
      console.error('[ArticleTagsService] Error adding tags to index:', error);
    }
  }

  /**
   * Remove tags from the global index
   * Only removes if no other articles use these tags
   */
  static async removeTagsFromIndex(tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return;
    
    try {
      const currentTags = await this.getAllTags();
      const articles = await StorageService.getAllArticles();
      
      // Check which tags are still used by other articles
      const tagsToRemove = tags.map(t => t.toLowerCase().trim());
      const stillUsedTags = new Set<string>();
      
      for (const article of articles) {
        if (article.tags) {
          for (const tag of article.tags) {
            stillUsedTags.add(tag.toLowerCase().trim());
          }
        }
      }
      
      // Only remove tags that are no longer used
      const updatedTags = currentTags.filter(tag => 
        !tagsToRemove.includes(tag) || stillUsedTags.has(tag)
      );
      
      await AsyncStorage.setItem(TAGS_INDEX_KEY, JSON.stringify(updatedTags));
    } catch (error) {
      console.error('[ArticleTagsService] Error removing tags from index:', error);
    }
  }

  /**
   * Refresh the entire tags index by scanning all articles
   * Use this for maintenance or initial setup
   */
  static async refreshTagIndex(): Promise<void> {
    try {
      const articles = await StorageService.getAllArticles();
      const allTags = new Set<string>();
      
      for (const article of articles) {
        if (article.tags) {
          for (const tag of article.tags) {
            allTags.add(tag.toLowerCase().trim());
          }
        }
      }
      
      const sortedTags = Array.from(allTags).sort();
      await AsyncStorage.setItem(TAGS_INDEX_KEY, JSON.stringify(sortedTags));
    } catch (error) {
      console.error('[ArticleTagsService] Error refreshing tags index:', error);
    }
  }

  /**
   * Validate and normalize a tag
   * - Trim whitespace
   * - Remove commas
   * - Convert to lowercase
   * - Max length 100
   */
  static normalizeTag(tag: string): string | null {
    const normalized = tag
      .trim()
      .toLowerCase()
      .replace(/,/g, '')
      .slice(0, 100);
    
    return normalized.length > 0 ? normalized : null;
  }

  /**
   * Validate tags array
   * - Max 10 tags
   * - Each tag max 100 chars
   * - Remove duplicates
   */
  static validateTags(tags: string[]): string[] {
    const normalizedTags = tags
      .map(tag => this.normalizeTag(tag))
      .filter((tag): tag is string => tag !== null);
    
    // Remove duplicates and limit to 10
    const uniqueTags = [...new Set(normalizedTags)];
    return uniqueTags.slice(0, 10);
  }
}
