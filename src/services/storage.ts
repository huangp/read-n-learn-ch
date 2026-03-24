import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, ArticleFormData, ReadingProgress } from '../types';
import { segmentArticle } from './segmentation';
import CharacterRecognitionService from './characterRecognition';
import DebugService from './debug';
import { ArticleTagsService } from './articleTags';

const ARTICLES_KEY = '@articles';
const READING_PROGRESS_KEY = '@reading_progress';

export class StorageService {
  static async getAllArticles(): Promise<Article[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(ARTICLES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error loading articles:', error);
      return [];
    }
  }

  static async getArticleById(id: string): Promise<Article | null> {
    try {
      const articles = await this.getAllArticles();
      const article = articles.find(a => a.id === id) || null;

      // Auto re-segment if article has content with newlines but segments
      // don't contain any newline tokens (stale segmentation)
      if (article && article.content && /\n/.test(article.content)) {
        const hasNewlineSegment = article.segments?.some(
          (s) => s.text === '\n' || s.text === '\n\n'
        );
        if (!hasNewlineSegment) {
          DebugService.log('STORAGE', 'Re-segmenting article (stale segments)', { id });
          const segments = await segmentArticle(article.content);
          article.segments = segments;
          // Persist the updated segments in background
          const allArticles = await this.getAllArticles();
          const idx = allArticles.findIndex(a => a.id === id);
          if (idx !== -1) {
            allArticles[idx].segments = segments;
            await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(allArticles));
          }
        }
      }

      return article;
    } catch (error) {
      console.error('Error getting article:', error);
      return null;
    }
  }

  static async saveArticle(formData: ArticleFormData, articleId?: string): Promise<Article> {
    DebugService.log('STORAGE', 'Saving article', { articleId, contentLength: formData.content?.length });
    
    try {
      const articles = await this.getAllArticles();
      const now = Date.now();
      
      // Segment the content for tap-to-lookup
      DebugService.log('STORAGE', 'Starting segmentation for article');
      const segments = await segmentArticle(formData.content);
      DebugService.log('STORAGE', `Segmentation complete: ${segments.length} segments`);
      
      // Normalize tags
      const normalizedTags = formData.tags ? ArticleTagsService.validateTags(formData.tags) : undefined;
      const formDataWithNormalizedTags = {
        ...formData,
        tags: normalizedTags
      };

      if (articleId) {
        const index = articles.findIndex(a => a.id === articleId);
        if (index !== -1) {
          // Get old tags for index update
          const oldTags = articles[index].tags || [];
          
          articles[index] = {
            ...articles[index],
            ...formDataWithNormalizedTags,
            updatedAt: now,
            wordCount: this.countChineseWords(formData.content),
            segments,
          };
          await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
          DebugService.log('STORAGE', 'Article updated successfully', { articleId, segmentsCount: segments.length });

          // Update tags index
          if (normalizedTags) {
            await ArticleTagsService.addTagsToIndex(normalizedTags);
          }
          // Remove old tags that are no longer used
          const removedTags = oldTags.filter(tag => !normalizedTags?.includes(tag));
          if (removedTags.length > 0) {
            ArticleTagsService.removeTagsFromIndex(removedTags, articles).catch(err =>
              console.warn('[storage] Failed to remove old tags from index:', err)
            );
          }

          // Compute and save article meta
          const chineseWords = segments.filter(s => s.type === 'chinese').map(s => s.text);
          CharacterRecognitionService.saveArticleMeta(articleId, formData.content, chineseWords)
            .catch(err => console.warn('[storage] Failed to save article meta:', err));

          return articles[index];
        }
      }

      const newArticle: Article = {
        id: articleId || this.generateId(formData.content),
        ...formDataWithNormalizedTags,
        createdAt: now,
        updatedAt: now,
        wordCount: this.countChineseWords(formData.content),
        segments,
      };

      articles.unshift(newArticle);
      await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
      DebugService.log('STORAGE', 'New article saved successfully', { articleId: newArticle.id, segmentsCount: segments.length });

      // Update tags index
      if (normalizedTags) {
        await ArticleTagsService.addTagsToIndex(normalizedTags);
      }

      // Compute and save article meta
      const chineseWords = segments.filter(s => s.type === 'chinese').map(s => s.text);
      CharacterRecognitionService.saveArticleMeta(newArticle.id, formData.content, chineseWords)
        .catch(err => console.warn('[storage] Failed to save article meta:', err));

      return newArticle;
    } catch (error) {
      DebugService.logError('STORAGE', 'Error saving article', error);
      throw error;
    }
  }

  static async deleteArticle(id: string): Promise<void> {
    try {
      const articles = await this.getAllArticles();
      const articleToDelete = articles.find(article => article.id === id);
      const filtered = articles.filter(article => article.id !== id);
      await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(filtered));
      
      // Remove tags from index if article had tags
      if (articleToDelete?.tags && articleToDelete.tags.length > 0) {
        ArticleTagsService.removeTagsFromIndex(articleToDelete.tags, filtered).catch(err =>
          console.warn('[storage] Failed to remove tags from index:', err)
        );
      }
      
      // Also delete reading progress and article meta for this article
      await this.deleteReadingProgress(id);
      CharacterRecognitionService.deleteArticleMeta(id)
        .catch(err => console.warn('[storage] Failed to delete article meta:', err));
    } catch (error) {
      console.error('Error deleting article:', error);
      throw error;
    }
  }

  static async searchArticles(query: string): Promise<Article[]> {
    try {
      const articles = await this.getAllArticles();
      const lowerQuery = query.toLowerCase();
      return articles.filter(
        article =>
          article.title.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching articles:', error);
      return [];
    }
  }

  private static generateId(content: string): string {
    // Simple djb2 hash for content-based ID
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) + hash) + content.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
  }

  private static countChineseWords(text: string): number {
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
    return chineseChars ? chineseChars.length : 0;
  }

  // Reading Progress Methods
  static async getReadingProgress(articleId: string): Promise<ReadingProgress | null> {
    try {
      const key = `${READING_PROGRESS_KEY}:${articleId}`;
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error loading reading progress:', error);
      return null;
    }
  }

  static async saveReadingProgress(progress: ReadingProgress): Promise<void> {
    try {
      const key = `${READING_PROGRESS_KEY}:${progress.articleId}`;
      await AsyncStorage.setItem(key, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving reading progress:', error);
      throw error;
    }
  }

  static async deleteReadingProgress(articleId: string): Promise<void> {
    try {
      const key = `${READING_PROGRESS_KEY}:${articleId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error deleting reading progress:', error);
      throw error;
    }
  }

  static async getAllReadingProgress(): Promise<ReadingProgress[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter(key => key.startsWith(READING_PROGRESS_KEY));
      const values = await AsyncStorage.multiGet(progressKeys);
      return values
        .filter(([_, value]) => value !== null)
        .map(([_, value]) => JSON.parse(value!));
    } catch (error) {
      console.error('Error loading all reading progress:', error);
      return [];
    }
  }
}
