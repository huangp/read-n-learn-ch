import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../storage';
import { Article, ArticleFormData } from '../../types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
}));

// Mock dependencies
jest.mock('../segmentation', () => ({
  segmentArticle: jest.fn(),
}));

jest.mock('../characterRecognition', () => ({
  __esModule: true,
  default: {
    saveArticleMeta: jest.fn().mockResolvedValue(undefined),
    deleteArticleMeta: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../debug', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    logError: jest.fn(),
  },
}));

jest.mock('../articleTags', () => ({
  ArticleTagsService: {
    validateTags: jest.fn((tags) => tags),
    addTagsToIndex: jest.fn().mockResolvedValue(undefined),
    removeTagsFromIndex: jest.fn().mockResolvedValue(undefined),
  },
}));

import { segmentArticle } from '../segmentation';
import CharacterRecognitionService from '../characterRecognition';
import { ArticleTagsService } from '../articleTags';

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    (AsyncStorage.getItem as jest.Mock).mockReset();
    (AsyncStorage.setItem as jest.Mock).mockReset();
    (AsyncStorage.removeItem as jest.Mock).mockReset();
    (AsyncStorage.getAllKeys as jest.Mock).mockReset();
    (AsyncStorage.multiGet as jest.Mock).mockReset();
  });

  describe('getAllArticles', () => {
    it('should return parsed articles from storage', async () => {
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'Test Article',
          content: 'Test content',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          wordCount: 10,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockArticles));

      const result = await StorageService.getAllArticles();

      expect(result).toEqual(mockArticles);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@articles');
    });

    it('should return empty array when no articles exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await StorageService.getAllArticles();

      expect(result).toEqual([]);
    });

    it('should return empty array when storage is empty string', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('');

      const result = await StorageService.getAllArticles();

      expect(result).toEqual([]);
    });
  });

  describe('getArticleById', () => {
    it('should return article by id', async () => {
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'Article 1',
          content: 'Content 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          wordCount: 10,
        },
        {
          id: '2',
          title: 'Article 2',
          content: 'Content 2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          wordCount: 20,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockArticles));

      const result = await StorageService.getArticleById('2');

      expect(result).toEqual(mockArticles[1]);
    });

    it('should return null when article not found', async () => {
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'Article 1',
          content: 'Content 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          wordCount: 10,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockArticles));

      const result = await StorageService.getArticleById('999');

      expect(result).toBeNull();
    });

    it('should trigger re-segmentation for stale segments', async () => {
      const mockArticle: Article = {
        id: '1',
        title: 'Test',
        content: 'Line 1\nLine 2',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        wordCount: 10,
        segments: [
          { id: '1', text: 'Line', type: 'other' },
          { id: '2', text: ' ', type: 'other' },
        ],
      };
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([mockArticle]))
        .mockResolvedValueOnce(JSON.stringify([mockArticle]));
      
      const newSegments = [
        { id: '1', text: 'Line', type: 'other' },
        { id: '2', text: ' ', type: 'other' },
        { id: '3', text: '1', type: 'other' },
        { id: '4', text: '\n', type: 'other' },
        { id: '5', text: 'Line', type: 'other' },
        { id: '6', text: ' ', type: 'other' },
        { id: '7', text: '2', type: 'other' },
      ];
      (segmentArticle as jest.Mock).mockResolvedValue(newSegments);

      const result = await StorageService.getArticleById('1');

      expect(segmentArticle).toHaveBeenCalledWith('Line 1\nLine 2');
      expect(result?.segments).toEqual(newSegments);
    });
  });

  describe('saveArticle', () => {
    const mockFormData: ArticleFormData = {
      title: 'New Article',
      content: 'New content',
      source: 'Test source',
    };

    it('should create new article with segments', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      const mockSegments = [
        { id: '1', text: 'Line', type: 'other' as const },
        { id: '2', text: ' ', type: 'other' as const },
      ];
      (segmentArticle as jest.Mock).mockResolvedValue(mockSegments);

      const result = await StorageService.saveArticle(mockFormData);

      expect(result.title).toBe('New Article');
      expect(result.content).toBe('New content');
      expect(result.segments).toEqual(mockSegments);
      expect(result.wordCount).toBe(0); // No Chinese characters in "New content"
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should update existing article', async () => {
      const existingArticle: Article = {
        id: 'existing-id',
        title: 'Old Title',
        content: 'Old content',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
        wordCount: 5,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([existingArticle]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      const mockSegments = [{ text: 'Updated', type: 'other' }];
      (segmentArticle as jest.Mock).mockResolvedValue(mockSegments);

      const result = await StorageService.saveArticle(mockFormData, 'existing-id');

      expect(result.id).toBe('existing-id');
      expect(result.title).toBe('New Article');
      expect(result.createdAt).toBe(existingArticle.createdAt);
      expect(result.updatedAt).toBeGreaterThan(existingArticle.updatedAt);
    });

    it('should count Chinese characters correctly', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      const formDataWithChinese: ArticleFormData = {
        title: '中文文章',
        content: '这是一些中文内容',
      };
      (segmentArticle as jest.Mock).mockResolvedValue([]);

      const result = await StorageService.saveArticle(formDataWithChinese);

      expect(result.wordCount).toBe(8); // 4 in title + 4 in content
    });

    it('should normalize and save tags', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (segmentArticle as jest.Mock).mockResolvedValue([]);

      const formDataWithTags: ArticleFormData = {
        title: 'Test',
        content: 'Content',
        tags: ['Tag1', 'Tag2'],
      };

      await StorageService.saveArticle(formDataWithTags);

      expect(ArticleTagsService.addTagsToIndex).toHaveBeenCalledWith(['Tag1', 'Tag2']);
    });

    it('should generate id from content hash', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (segmentArticle as jest.Mock).mockResolvedValue([]);

      const result = await StorageService.saveArticle(mockFormData);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });
  });

  describe('deleteArticle', () => {
    const createdAt = Date.now();
    it('should delete article and cleanup', async () => {
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'Article 1',
          content: 'Content 1',
          createdAt: createdAt,
          updatedAt: createdAt,
          wordCount: 10,
          tags: ['tag1', 'tag2'],
        },
        {
          id: '2',
          title: 'Article 2',
          content: 'Content 2',
          createdAt: createdAt,
          updatedAt: createdAt,
          wordCount: 20,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockArticles));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await StorageService.deleteArticle('1');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@articles',
        expect.stringContaining('Article 2')
      );
      expect(ArticleTagsService.removeTagsFromIndex).toHaveBeenCalledWith(['tag1', 'tag2'], [{"content": "Content 2", "createdAt": createdAt, "id": "2", "title": "Article 2", "updatedAt": createdAt, "wordCount": 20}]);
      expect(CharacterRecognitionService.deleteArticleMeta).toHaveBeenCalledWith('1');
    });

    it('should handle deleting article with no tags', async () => {
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'Article 1',
          content: 'Content 1',
          createdAt: createdAt,
          updatedAt: createdAt,
          wordCount: 10,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockArticles));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await StorageService.deleteArticle('1');

      expect(ArticleTagsService.removeTagsFromIndex).not.toHaveBeenCalled();
    });
  });

  describe('searchArticles', () => {
    it('should return articles matching query', async () => {
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'Chinese Language Learning',
          content: 'Content 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          wordCount: 10,
        },
        {
          id: '2',
          title: 'Japanese Basics',
          content: 'Content 2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          wordCount: 20,
        },
        {
          id: '3',
          title: 'Advanced Chinese',
          content: 'Content 3',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          wordCount: 30,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockArticles));

      const result = await StorageService.searchArticles('chinese');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('should return empty array when no matches', async () => {
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'Article 1',
          content: 'Content 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          wordCount: 10,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockArticles));

      const result = await StorageService.searchArticles('nonexistent');

      expect(result).toEqual([]);
    });

    it('should perform case-insensitive search', async () => {
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'CHINESE Language',
          content: 'Content 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          wordCount: 10,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockArticles));

      const result = await StorageService.searchArticles('chinese');

      expect(result).toHaveLength(1);
    });
  });

  describe('Reading Progress Methods', () => {
    describe('getReadingProgress', () => {
      it('should return reading progress for article', async () => {
        const mockProgress = {
          articleId: '1',
          scrollPosition: 500,
          lastReadAt: Date.now(),
        };
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockProgress));

        const result = await StorageService.getReadingProgress('1');

        expect(result).toEqual(mockProgress);
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('@reading_progress:1');
      });

      it('should return null when no progress exists', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const result = await StorageService.getReadingProgress('1');

        expect(result).toBeNull();
      });
    });

    describe('saveReadingProgress', () => {
      it('should save reading progress', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        const progress = {
          articleId: '1',
          scrollPercentage: 45,
          lastReadAt: Date.now(),
        };

        await StorageService.saveReadingProgress(progress);

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          '@reading_progress:1',
          JSON.stringify(progress)
        );
      });
    });

    describe('deleteReadingProgress', () => {
      it('should delete reading progress', async () => {
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

        await StorageService.deleteReadingProgress('1');

        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@reading_progress:1');
      });
    });

    describe('getAllReadingProgress', () => {
      it('should return all reading progress entries', async () => {
        (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
          '@reading_progress:1',
          '@reading_progress:2',
          '@other_key',
        ]);
        
        const mockProgress1 = { articleId: '1', scrollPosition: 100 };
        const mockProgress2 = { articleId: '2', scrollPosition: 200 };
        (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
          ['@reading_progress:1', JSON.stringify(mockProgress1)],
          ['@reading_progress:2', JSON.stringify(mockProgress2)],
        ]);

        const result = await StorageService.getAllReadingProgress();

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(mockProgress1);
        expect(result[1]).toEqual(mockProgress2);
      });

      it('should return empty array when no progress exists', async () => {
        (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['@other_key']);

        const result = await StorageService.getAllReadingProgress();

        expect(result).toEqual([]);
      });

      it('should filter out null values', async () => {
        (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
          '@reading_progress:1',
          '@reading_progress:2',
        ]);
        (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
          ['@reading_progress:1', JSON.stringify({ articleId: '1' })],
          ['@reading_progress:2', null],
        ]);

        const result = await StorageService.getAllReadingProgress();

        expect(result).toHaveLength(1);
      });
    });
  });
});
