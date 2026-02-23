import { ReadingProgress } from '../../types';
import {
  getPageForPosition,
  getPositionForPage,
  roundToWordBoundary,
  paginateContent,
} from '../../utils/pagination';

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

describe('Reading Progress with Character Position', () => {
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
    it('should save reading progress with character position', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition: 50,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      await StorageService.saveReadingProgress(progress);

      const savedProgress = await StorageService.getReadingProgress(mockArticleId);
      
      expect(savedProgress).not.toBeNull();
      expect(savedProgress?.charPosition).toBe(50);
      expect(savedProgress?.totalChars).toBe(sampleContent.length);
      expect(savedProgress?.articleId).toBe(mockArticleId);
    });

    it('should load reading progress for an article', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition: 100,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      await StorageService.saveReadingProgress(progress);
      const loadedProgress = await StorageService.getReadingProgress(mockArticleId);

      expect(loadedProgress?.charPosition).toBe(100);
    });

    it('should return null for non-existent progress', async () => {
      const progress = await StorageService.getReadingProgress('non-existent-id');
      
      expect(progress).toBeNull();
    });

    it('should update existing progress', async () => {
      const initialProgress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition: 50,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      await StorageService.saveReadingProgress(initialProgress);

      const updatedProgress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition: 150,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      await StorageService.saveReadingProgress(updatedProgress);

      const savedProgress = await StorageService.getReadingProgress(mockArticleId);
      expect(savedProgress?.charPosition).toBe(150);
    });
  });

  describe('Delete Progress', () => {
    it('should delete reading progress', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition: 50,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
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

  describe('Character Position Stability', () => {
    it('should maintain valid position when content is unchanged', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition: 50,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      await StorageService.saveReadingProgress(progress);
      const savedProgress = await StorageService.getReadingProgress(mockArticleId);

      // Position should remain valid
      expect(savedProgress?.charPosition).toBeLessThanOrEqual(sampleContent.length);
      expect(savedProgress?.charPosition).toBeGreaterThanOrEqual(0);
    });

    it('should round position to word boundary before saving', async () => {
      // Position in middle of a word
      const rawPosition = 47; // In middle of "达特茅斯"
      const roundedPosition = roundToWordBoundary(rawPosition, sampleContent);

      const progress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition: roundedPosition,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      await StorageService.saveReadingProgress(progress);
      const savedProgress = await StorageService.getReadingProgress(mockArticleId);

      // Should be at word boundary (start of word)
      expect(savedProgress?.charPosition).toBe(roundedPosition);
    });
  });

  describe('Position to Page Conversion', () => {
    it('should convert character position to correct page', () => {
      const pages = ['第一页内容。', '第二页内容。', '第三页内容。'];
      
      // Position in first page
      expect(getPageForPosition(3, pages)).toBe(0);
      
      // Position in second page
      const secondPageStart = pages[0].length + 2;
      expect(getPageForPosition(secondPageStart, pages)).toBe(1);
      
      // Position in third page
      const thirdPageStart = pages[0].length + pages[1].length + 2;
      expect(getPageForPosition(thirdPageStart, pages)).toBe(2);
    });

    it('should convert page to character position', () => {
      const pages = ['第一页内容。', '第二页内容。', '第三页内容。'];
      
      // First page starts at 0
      expect(getPositionForPage(0, pages)).toBe(0);
      
      // Second page starts after first
      expect(getPositionForPage(1, pages)).toBe(pages[0].length);
      
      // Third page starts after first two
      expect(getPositionForPage(2, pages)).toBe(pages[0].length + pages[1].length);
    });
  });

  describe('Font Size Change Adaptation', () => {
    // TODO: Add tests when font size settings are implemented
    // These tests verify that character position remains valid across font size changes
    
    it.skip('TODO: should find correct page after font size increases', () => {
      // When font size increases, pages have fewer characters
      // But character position should still map to correct content location
      
      // 1. Save progress at character position 100
      // 2. Increase font size (recalculate pagination)
      // 3. Verify position 100 still maps to correct page containing that content
    });

    it.skip('TODO: should find correct page after font size decreases', () => {
      // When font size decreases, pages have more characters
      // Character position should map to a page number that contains that content
      
      // 1. Save progress at character position 100
      // 2. Decrease font size (recalculate pagination)
      // 3. Verify position 100 maps to correct new page
    });

    it.skip('TODO: should handle position at end of content after font change', () => {
      // Edge case: position near end of content
      // Should always map to last page regardless of font size
    });
  });

  describe('Integration with Pagination', () => {
    it('should restore to correct page from saved position', () => {
      // Create paginated content
      const result = paginateContent(
        sampleContent,
        375, // Phone width
        812, // Phone height
        18,
        32
      );

      // Save progress at character position 50
      const charPosition = 50;
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      // Determine which page contains this position
      const expectedPage = getPageForPosition(charPosition, result.pages);

      // Verify position maps to a valid page
      expect(expectedPage).toBeGreaterThanOrEqual(0);
      expect(expectedPage).toBeLessThan(result.totalPages);
    });

    it('should save position from current page', () => {
      const result = paginateContent(
        sampleContent,
        375,
        812,
        18,
        32
      );

      // User is on page 2
      const currentPage = 1;
      
      // Calculate position at start of this page
      const charPosition = getPositionForPage(currentPage, result.pages);

      const progress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      expect(progress.charPosition).toBeGreaterThanOrEqual(0);
      expect(progress.charPosition).toBeLessThan(sampleContent.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle position 0 (start of article)', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition: 0,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      await StorageService.saveReadingProgress(progress);
      const saved = await StorageService.getReadingProgress(mockArticleId);

      expect(saved?.charPosition).toBe(0);
      
      // Should map to first page
      const pages = ['第一页', '第二页'];
      expect(getPageForPosition(0, pages)).toBe(0);
    });

    it('should handle position at end of article', async () => {
      const progress: ReadingProgress = {
        articleId: mockArticleId,
        charPosition: sampleContent.length,
        totalChars: sampleContent.length,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      await StorageService.saveReadingProgress(progress);
      const saved = await StorageService.getReadingProgress(mockArticleId);

      expect(saved?.charPosition).toBe(sampleContent.length);
      
      // Should map to last page
      const pages = ['第一页', '第二页', '第三页'];
      expect(getPageForPosition(sampleContent.length, pages)).toBe(2);
    });

    it('should handle multiple articles progress', async () => {
      const progress1: ReadingProgress = {
        articleId: 'article-1',
        charPosition: 50,
        totalChars: 1000,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      const progress2: ReadingProgress = {
        articleId: 'article-2',
        charPosition: 200,
        totalChars: 2000,
        lastReadAt: Date.now(),
        currentPage: 0,
        totalPages: 1,
      };

      await StorageService.saveReadingProgress(progress1);
      await StorageService.saveReadingProgress(progress2);

      const saved1 = await StorageService.getReadingProgress('article-1');
      const saved2 = await StorageService.getReadingProgress('article-2');

      expect(saved1?.charPosition).toBe(50);
      expect(saved2?.charPosition).toBe(200);
    });
  });
});