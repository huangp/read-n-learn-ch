import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, ArticleFormData, ReadingProgress, SegmentedWord } from '../types';
import { segmentArticle } from './segmentation';

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
      return articles.find(article => article.id === id) || null;
    } catch (error) {
      console.error('Error getting article:', error);
      return null;
    }
  }

  static async saveArticle(formData: ArticleFormData, articleId?: string): Promise<Article> {
    try {
      const articles = await this.getAllArticles();
      const now = Date.now();
      
      // Segment the content for tap-to-lookup
      const segments = await segmentArticle(formData.content);
      
      if (articleId) {
        const index = articles.findIndex(a => a.id === articleId);
        if (index !== -1) {
          articles[index] = {
            ...articles[index],
            ...formData,
            updatedAt: now,
            wordCount: this.countChineseWords(formData.content),
            segments,
          };
          await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
          return articles[index];
        }
      }

      const newArticle: Article = {
        id: articleId || this.generateId(),
        ...formData,
        createdAt: now,
        updatedAt: now,
        wordCount: this.countChineseWords(formData.content),
        segments,
      };

      articles.unshift(newArticle);
      await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
      return newArticle;
    } catch (error) {
      console.error('Error saving article:', error);
      throw error;
    }
  }

  static async deleteArticle(id: string): Promise<void> {
    try {
      const articles = await this.getAllArticles();
      const filtered = articles.filter(article => article.id !== id);
      await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(filtered));
      
      // Also delete reading progress for this article
      await this.deleteReadingProgress(id);
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
          article.title.toLowerCase().includes(lowerQuery) ||
          article.content.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching articles:', error);
      return [];
    }
  }

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
