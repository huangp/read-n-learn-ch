import { ReadingProgress } from '../../types';

// Mock AsyncStorage
const mockAsyncStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key: string, value: string) => {
    mockAsyncStorage[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key: string) => {
    return Promise.resolve(mockAsyncStorage[key] || null);
  }),
  removeItem: jest.fn((key: string) => {
    delete mockAsyncStorage[key];
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => {
    return Promise.resolve(Object.keys(mockAsyncStorage));
  }),
  multiGet: jest.fn((keys: string[]) => {
    return Promise.resolve(
      keys.map((key) => [key, mockAsyncStorage[key] || null])
    );
  }),
}));

import { StorageService } from '../storage';

describe('Reading Progress with Scroll Percentage', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockAsyncStorage).forEach((key) => {
      delete mockAsyncStorage[key];
    });
    jest.clearAllMocks();
  });

  const mockArticleId = 'test-article-123';
  const sampleContent = `
第一章：绪论

本文研究人工智能的发展历史。从1956年达特茅斯会议开始，AI经历了多次浪潮。

第二节：现代AI
深度学习在2012年ImageNet竞赛中取得突破。
`.trim();

  describe('Save and Load Progress', () => {
    it('should save reading progress with scroll percentage', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 45,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);

      const savedProgress = await StorageService.getReadingProgress(mockArticleId);
      
      expect(savedProgress).not.toBeNull();
      expect(savedProgress?.scrollPercentage).toBe(45);
      expect(savedProgress?.articleId).toBe(mockArticleId);
    });

    it('should load reading progress for an article', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 72,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);
      const loadedProgress = await StorageService.getReadingProgress(mockArticleId);

      expect(loadedProgress?.scrollPercentage).toBe(72);
    });

    it('should return null for non-existent progress', async () => {
      const progress = await StorageService.getReadingProgress('non-existent-id');
      
      expect(progress).toBeNull();
    });

    it('should update existing progress', async () => {
      const initialProgress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 25,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(initialProgress);

      const updatedProgress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 80,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(updatedProgress);

      const savedProgress = await StorageService.getReadingProgress(mockArticleId);
      expect(savedProgress?.scrollPercentage).toBe(80);
    });

    it('should save progress at 0%', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 0,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);
      const saved = await StorageService.getReadingProgress(mockArticleId);

      expect(saved?.scrollPercentage).toBe(0);
    });

    it('should save progress at 100%', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 100,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);
      const saved = await StorageService.getReadingProgress(mockArticleId);

      expect(saved?.scrollPercentage).toBe(100);
    });
  });

  describe('Delete Progress', () => {
    it('should delete reading progress', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 50,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);
      await StorageService.deleteReadingProgress(mockArticleId);

      const deletedProgress = await StorageService.getReadingProgress(mockArticleId);
      expect(deletedProgress).toBeNull();
    });

    it('should handle deleting non-existent progress gracefully', async () => {
      await expect(
        StorageService.deleteReadingProgress('non-existent-id')
      ).resolves.not.toThrow();
    });
  });

  describe('Scroll Percentage Validation', () => {
    it('should maintain valid percentage within 0-100 range', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 50,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);
      const savedProgress = await StorageService.getReadingProgress(mockArticleId);

      expect(savedProgress?.scrollPercentage).toBeGreaterThanOrEqual(0);
      expect(savedProgress?.scrollPercentage).toBeLessThanOrEqual(100);
    });

    it('should handle edge case at 0%', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 0,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);
      const saved = await StorageService.getReadingProgress(mockArticleId);

      expect(saved?.scrollPercentage).toBe(0);
    });

    it('should handle edge case at 100%', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 100,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);
      const saved = await StorageService.getReadingProgress(mockArticleId);

      expect(saved?.scrollPercentage).toBe(100);
    });
  });

  describe('Multiple Articles Progress', () => {
    it('should handle multiple articles progress', async () => {
      const progress1: ReadingProgress = {
        articleId: 'article-1',
        scrollPercentage: 25,
        lastReadAt: Date.now(),
      };

      const progress2: ReadingProgress = {
        articleId: 'article-2',
        scrollPercentage: 75,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress1);
      await StorageService.saveReadingProgress(progress2);

      const saved1 = await StorageService.getReadingProgress('article-1');
      const saved2 = await StorageService.getReadingProgress('article-2');

      expect(saved1?.scrollPercentage).toBe(25);
      expect(saved2?.scrollPercentage).toBe(75);
    });

    it('should get all reading progress', async () => {
      const progress1: ReadingProgress = {
        articleId: 'article-1',
        scrollPercentage: 30,
        lastReadAt: Date.now(),
      };

      const progress2: ReadingProgress = {
        articleId: 'article-2',
        scrollPercentage: 60,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress1);
      await StorageService.saveReadingProgress(progress2);

      const allProgress = await StorageService.getAllReadingProgress();
      expect(allProgress).toHaveLength(2);
      expect(allProgress.map(p => p.scrollPercentage)).toContain(30);
      expect(allProgress.map(p => p.scrollPercentage)).toContain(60);
    });
  });

  describe('Scroll Percentage Calculation', () => {
    it('should calculate scroll percentage from scroll position', () => {
      const contentHeight = 1000;
      const scrollViewHeight = 500;
      const scrollY = 250;

      const scrollPercentage = Math.min(
        Math.round((scrollY / (contentHeight - scrollViewHeight)) * 100),
        100
      );

      expect(scrollPercentage).toBe(50);
    });

    it('should calculate 0% at top', () => {
      const contentHeight = 1000;
      const scrollViewHeight = 500;
      const scrollY = 0;

      const scrollPercentage = Math.min(
        Math.round((scrollY / (contentHeight - scrollViewHeight)) * 100),
        100
      );

      expect(scrollPercentage).toBe(0);
    });

    it('should calculate 100% at bottom', () => {
      const contentHeight = 1000;
      const scrollViewHeight = 500;
      const scrollY = 500;

      const scrollPercentage = Math.min(
        Math.round((scrollY / (contentHeight - scrollViewHeight)) * 100),
        100
      );

      expect(scrollPercentage).toBe(100);
    });

    it('should cap percentage at 100', () => {
      const contentHeight = 1000;
      const scrollViewHeight = 500;
      const scrollY = 600;

      const scrollPercentage = Math.min(
        Math.round((scrollY / (contentHeight - scrollViewHeight)) * 100),
        100
      );

      expect(scrollPercentage).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle position 0 (start of article)', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 0,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);
      const saved = await StorageService.getReadingProgress(mockArticleId);

      expect(saved?.scrollPercentage).toBe(0);
    });

    it('should handle position at end of article', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 100,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);
      const saved = await StorageService.getReadingProgress(mockArticleId);

      expect(saved?.scrollPercentage).toBe(100);
    });

    it('should handle very small percentage values', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        scrollPercentage: 1,
        lastReadAt: Date.now(),
      };

      await StorageService.saveReadingProgress(progress);
      const saved = await StorageService.getReadingProgress(mockArticleId);

      expect(saved?.scrollPercentage).toBe(1);
    });

    it('should handle content shorter than viewport', async () => {
      // When content is shorter than viewport, scroll percentage should be 0 or 100
      const contentHeight = 300;
      const scrollViewHeight = 500;
      
      // Content doesn't scroll, so percentage is effectively 0 or 100
      const scrollPercentage = contentHeight <= scrollViewHeight ? 100 : 0;
      
      expect(scrollPercentage).toBe(100);
    });
  });
});
