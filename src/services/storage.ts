import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, ArticleFormData } from '../types';

const ARTICLES_KEY = '@articles';

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
      
      if (articleId) {
        const index = articles.findIndex(a => a.id === articleId);
        if (index !== -1) {
          articles[index] = {
            ...articles[index],
            ...formData,
            updatedAt: now,
            wordCount: this.countChineseWords(formData.content),
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
}
