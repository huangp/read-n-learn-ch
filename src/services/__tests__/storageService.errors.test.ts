import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../storage';
import DebugService from '../debug';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
}));

// Mock DebugService
jest.mock('../debug', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    logError: jest.fn(),
  },
}));

// Mock segmentation
jest.mock('../segmentation', () => ({
  segmentArticle: jest.fn(),
}));

describe('StorageService - Error Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllArticles', () => {
    it('should return empty array when AsyncStorage throws error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await StorageService.getAllArticles();

      expect(result).toEqual([]);
    });

    it('should return empty array when JSON parsing fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await StorageService.getAllArticles();

      expect(result).toEqual([]);
    });
  });

  describe('getArticleById', () => {
    it('should return null when AsyncStorage throws error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await StorageService.getArticleById('1');

      expect(result).toBeNull();
    });

    it('should return null when JSON parsing fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await StorageService.getArticleById('1');

      expect(result).toBeNull();
    });
  });

  describe('saveArticle', () => {
    it('should throw error when AsyncStorage.setItem fails', async () => {
      const { segmentArticle } = require('../segmentation');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write error'));
      segmentArticle.mockResolvedValue([{ id: '1', text: 'Test', type: 'other' }]);

      await expect(
        StorageService.saveArticle({ title: 'Test', content: 'Content' })
      ).rejects.toThrow('Write error');
    });

    it('should throw error when segmentation fails', async () => {
      const { segmentArticle } = require('../segmentation');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      segmentArticle.mockRejectedValue(new Error('Segmentation error'));

      await expect(
        StorageService.saveArticle({ title: 'Test', content: 'Content' })
      ).rejects.toThrow('Segmentation error');
    });

    it('should log error when saving article', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write error'));

      try {
        await StorageService.saveArticle({ title: 'Test', content: 'Content' });
      } catch (e) {
        // Expected to throw
      }

      expect(DebugService.logError).toHaveBeenCalled();
    });
  });

  describe('deleteArticle', () => {
    it('should throw error when AsyncStorage throws', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(StorageService.deleteArticle('1')).rejects.toThrow();
    });

    it('should throw error when setItem fails during delete', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([{ id: '1', title: 'Test' }]));
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write error'));

      await expect(StorageService.deleteArticle('1')).rejects.toThrow('Write error');
    });
  });

  describe('searchArticles', () => {
    it('should return empty array when AsyncStorage throws error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await StorageService.searchArticles('query');

      expect(result).toEqual([]);
    });

    it('should return empty array when JSON parsing fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await StorageService.searchArticles('query');

      expect(result).toEqual([]);
    });
  });

  describe('Reading Progress Error Cases', () => {
    describe('getReadingProgress', () => {
      it('should return null when AsyncStorage throws error', async () => {
        (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

        const result = await StorageService.getReadingProgress('1');

        expect(result).toBeNull();
      });

      it('should return null when JSON parsing fails', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

        const result = await StorageService.getReadingProgress('1');

        expect(result).toBeNull();
      });
    });

    describe('saveReadingProgress', () => {
      it('should throw error when AsyncStorage.setItem fails', async () => {
        (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write error'));

        await expect(
          StorageService.saveReadingProgress({
            articleId: '1',
            scrollPercentage: 45,
            lastReadAt: Date.now(),
          })
        ).rejects.toThrow('Write error');
      });
    });

    describe('deleteReadingProgress', () => {
      it('should throw error when AsyncStorage.removeItem fails', async () => {
        (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Delete error'));

        await expect(StorageService.deleteReadingProgress('1')).rejects.toThrow('Delete error');
      });
    });

    describe('getAllReadingProgress', () => {
      it('should return empty array when getAllKeys throws error', async () => {
        (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(new Error('Storage error'));

        const result = await StorageService.getAllReadingProgress();

        expect(result).toEqual([]);
      });

      it('should return empty array when multiGet throws error', async () => {
        (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['@reading_progress:1']);
        (AsyncStorage.multiGet as jest.Mock).mockRejectedValue(new Error('Storage error'));

        const result = await StorageService.getAllReadingProgress();

        expect(result).toEqual([]);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty article list', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      const result = await StorageService.getAllArticles();

      expect(result).toEqual([]);
    });

    it('should handle article with empty content', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: '1', title: 'Test', content: '', createdAt: Date.now(), updatedAt: Date.now() }])
      );

      const result = await StorageService.getArticleById('1');

      expect(result?.content).toBe('');
    });

    it('should handle article with special characters in title', async () => {
      const specialTitle = 'Test <script>alert("xss")</script>';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([{ 
          id: '1', 
          title: specialTitle, 
          content: 'Content', 
          createdAt: Date.now(), 
          updatedAt: Date.now() 
        }])
      );

      const result = await StorageService.getArticleById('1');

      expect(result?.title).toBe(specialTitle);
    });

    it('should handle very long content', async () => {
      const longContent = 'a'.repeat(1000000);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([{ 
          id: '1', 
          title: 'Test', 
          content: longContent, 
          createdAt: Date.now(), 
          updatedAt: Date.now() 
        }])
      );

      const result = await StorageService.getArticleById('1');

      expect(result?.content).toBe(longContent);
    });

    it('should handle duplicate article IDs', async () => {
      const articles = [
        { id: '1', title: 'First', content: 'Content 1', createdAt: Date.now(), updatedAt: Date.now() },
        { id: '1', title: 'Duplicate', content: 'Content 2', createdAt: Date.now(), updatedAt: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(articles));

      const result = await StorageService.getArticleById('1');

      expect(result?.title).toBe('First'); // Should return first match
    });

    it('should handle search with empty query', async () => {
      const articles = [
        { id: '1', title: 'Test', content: 'Content', createdAt: Date.now(), updatedAt: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(articles));

      const result = await StorageService.searchArticles('');

      expect(result).toHaveLength(1);
    });

    it('should handle search with special regex characters', async () => {
      const articles = [
        { id: '1', title: 'Test [special]', content: 'Content', createdAt: Date.now(), updatedAt: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(articles));

      const result = await StorageService.searchArticles('[special]');

      expect(result).toHaveLength(1);
    });
  });
});
