import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from '../types';
import { StorageService } from './storage';
import { segmentArticle } from './segmentation';
import CharacterRecognitionService from './characterRecognition';
import { ArticleTagsService } from './articleTags';
import DebugService from './debug';

const INITIAL_ARTICLES_LOADED_KEY = '@initial_articles_loaded';

/**
 * Load initial sample articles from bundled JSON file.
 * Only runs once on first app launch.
 */
export async function loadInitialArticles(): Promise<void> {
  try {
    // Check if we've already loaded initial articles
    const alreadyLoaded = await AsyncStorage.getItem(INITIAL_ARTICLES_LOADED_KEY);
    if (alreadyLoaded === 'true') {
      DebugService.log('INITIAL_ARTICLES', 'Initial articles already loaded, skipping');
      return;
    }

    DebugService.log('INITIAL_ARTICLES', 'Loading initial sample articles...');

    // Load articles from bundled JSON
    const initialArticles: Article[] = require('../../assets/articles/initial-articles.json');
    
    if (!initialArticles || !Array.isArray(initialArticles) || initialArticles.length === 0) {
      DebugService.log('INITIAL_ARTICLES', 'No initial articles found in bundle');
      return;
    }

    DebugService.log('INITIAL_ARTICLES', `Found ${initialArticles.length} articles to load`);

    // Get existing articles to avoid duplicates
    const existingArticles = await StorageService.getAllArticles();
    const existingIds = new Set(existingArticles.map(a => a.id));

    // Process and save each article
    let loadedCount = 0;
    for (const article of initialArticles) {
      // Skip if article already exists
      if (existingIds.has(article.id)) {
        DebugService.log('INITIAL_ARTICLES', `Skipping duplicate article: ${article.id}`);
        continue;
      }

      try {
        // Segment the article content for tap-to-lookup
        DebugService.log('INITIAL_ARTICLES', `Segmenting article: ${article.title}`);
        const segments = await segmentArticle(article.content);
        
        // Create full article with segments
        const fullArticle: Article = {
          ...article,
          segments,
        };

        // Save to storage
        const articles = await StorageService.getAllArticles();
        articles.unshift(fullArticle);
        await AsyncStorage.setItem('@articles', JSON.stringify(articles));

        // Update tags index
        if (article.tags && article.tags.length > 0) {
          await ArticleTagsService.addTagsToIndex(article.tags);
        }

        // Compute and save article meta for statistics
        const chineseWords = segments.filter(s => s.type === 'chinese').map(s => s.text);
        await CharacterRecognitionService.saveArticleMeta(
          article.id,
          article.content,
          chineseWords
        );

        loadedCount++;
        DebugService.log('INITIAL_ARTICLES', `Loaded article: ${article.title}`);
      } catch (error) {
        DebugService.logError('INITIAL_ARTICLES', `Failed to load article ${article.id}`, error);
        // Continue with next article even if one fails
      }
    }

    // Mark as loaded
    await AsyncStorage.setItem(INITIAL_ARTICLES_LOADED_KEY, 'true');
    
    DebugService.log('INITIAL_ARTICLES', `Successfully loaded ${loadedCount} sample articles`);
  } catch (error) {
    DebugService.logError('INITIAL_ARTICLES', 'Failed to load initial articles', error);
    // Don't throw - app should still work even if sample articles fail to load
  }
}

/**
 * Check if initial articles have been loaded.
 * Useful for debugging or reset functionality.
 */
export async function haveInitialArticlesBeenLoaded(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(INITIAL_ARTICLES_LOADED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Reset the initial articles loaded flag.
 * Call this if you want to reload articles (e.g., after app update with new samples).
 */
export async function resetInitialArticlesFlag(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INITIAL_ARTICLES_LOADED_KEY);
    DebugService.log('INITIAL_ARTICLES', 'Reset initial articles flag');
  } catch (error) {
    DebugService.logError('INITIAL_ARTICLES', 'Failed to reset flag', error);
  }
}
