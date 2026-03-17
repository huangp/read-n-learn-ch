import { ProgressDBUtils } from '../../utils/database/progress';
import { progressService } from '../progressService';

// Mock the database module
jest.mock('../../utils/database/progress');

describe('progressService - Error Cases', () => {
  beforeEach(() => {
    // Reset the singleton instance
    (progressService as any).dbUtils = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('database initialization failures', () => {
    it('should throw error when getWordsForReview fails to initialize db', async () => {
      (ProgressDBUtils.create as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      await expect(progressService.getWordsForReview()).rejects.toThrow('DB connection failed');
    });

    it('should throw error when getProblemWords fails to initialize db', async () => {
      (ProgressDBUtils.create as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      await expect(progressService.getProblemWords()).rejects.toThrow('DB connection failed');
    });

    it('should throw error when getDailyStats fails to initialize db', async () => {
      (ProgressDBUtils.create as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      await expect(progressService.getDailyStats(0, 0)).rejects.toThrow('DB connection failed');
    });

    it('should throw error when getOverallLearningStats fails to initialize db', async () => {
      (ProgressDBUtils.create as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      await expect(progressService.getOverallLearningStats()).rejects.toThrow('DB connection failed');
    });

    it('should throw error when getReadingStreak fails to initialize db', async () => {
      (ProgressDBUtils.create as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      await expect(progressService.getReadingStreak()).rejects.toThrow('DB connection failed');
    });

    it('should throw error when getBadgeProgress fails to initialize db', async () => {
      (ProgressDBUtils.create as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      await expect(progressService.getBadgeProgress()).rejects.toThrow('DB connection failed');
    });
  });

  describe('null dbUtils handling', () => {
    it('should handle null dbUtils in getWordsForReview', async () => {
      // Simulate dbUtils being null after initialization
      (ProgressDBUtils.create as jest.Mock).mockResolvedValue(null);

      const result = await progressService.getWordsForReview();

      expect(result).toEqual([]);
    });

    it('should handle null dbUtils in getProblemWords', async () => {
      (ProgressDBUtils.create as jest.Mock).mockResolvedValue(null);

      const result = await progressService.getProblemWords();

      expect(result).toEqual([]);
    });

    it('should handle null dbUtils in getDailyStats', async () => {
      (ProgressDBUtils.create as jest.Mock).mockResolvedValue(null);

      const result = await progressService.getDailyStats(0, 0);

      expect(result).toEqual([]);
    });

    it('should handle null dbUtils in getOverallLearningStats', async () => {
      (ProgressDBUtils.create as jest.Mock).mockResolvedValue(null);

      const result = await progressService.getOverallLearningStats();

      expect(result).toEqual({
        totalVocabularyExposed: 0,
        totalVocabularyKnown: 0,
        totalArticlesRead: 0,
      });
    });

    it('should handle null dbUtils in getReadingStreak', async () => {
      (ProgressDBUtils.create as jest.Mock).mockResolvedValue(null);

      const result = await progressService.getReadingStreak();

      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
      });
    });

    it('should handle null dbUtils in getBadgeProgress', async () => {
      (ProgressDBUtils.create as jest.Mock).mockResolvedValue(null);

      const result = await progressService.getBadgeProgress();

      expect(result).toEqual([]);
    });
  });

  describe('database query failures', () => {
    let mockDbUtils: any;

    beforeEach(() => {
      mockDbUtils = {
        getWordsForReview: jest.fn(),
        getProblemWords: jest.fn(),
        getDailyStats: jest.fn(),
        getOverallLearningStats: jest.fn(),
        getReadingStreak: jest.fn(),
        getBadgeProgress: jest.fn(),
      };
      (ProgressDBUtils.create as jest.Mock).mockResolvedValue(mockDbUtils);
    });

    it('should handle error in getWordsForReview query', async () => {
      mockDbUtils.getWordsForReview.mockRejectedValue(new Error('Query failed'));

      await expect(progressService.getWordsForReview()).rejects.toThrow('Query failed');
    });

    it('should handle error in getProblemWords query', async () => {
      mockDbUtils.getProblemWords.mockRejectedValue(new Error('Query failed'));

      await expect(progressService.getProblemWords()).rejects.toThrow('Query failed');
    });

    it('should handle error in getDailyStats query', async () => {
      mockDbUtils.getDailyStats.mockRejectedValue(new Error('Query failed'));

      await expect(progressService.getDailyStats(0, 0)).rejects.toThrow('Query failed');
    });

    it('should handle error in getOverallLearningStats query', async () => {
      mockDbUtils.getOverallLearningStats.mockRejectedValue(new Error('Query failed'));

      await expect(progressService.getOverallLearningStats()).rejects.toThrow('Query failed');
    });

    it('should handle error in getReadingStreak query', async () => {
      mockDbUtils.getReadingStreak.mockRejectedValue(new Error('Query failed'));

      await expect(progressService.getReadingStreak()).rejects.toThrow('Query failed');
    });

    it('should handle error in getBadgeProgress query', async () => {
      mockDbUtils.getBadgeProgress.mockRejectedValue(new Error('Query failed'));

      await expect(progressService.getBadgeProgress()).rejects.toThrow('Query failed');
    });
  });

  describe('edge cases', () => {
    let mockDbUtils: any;

    beforeEach(() => {
      mockDbUtils = {
        getWordsForReview: jest.fn(),
        getProblemWords: jest.fn(),
        getDailyStats: jest.fn(),
        getOverallLearningStats: jest.fn(),
        getReadingStreak: jest.fn(),
        getBadgeProgress: jest.fn(),
      };
      (ProgressDBUtils.create as jest.Mock).mockResolvedValue(mockDbUtils);
    });

    it('should handle words with zero lookup count', async () => {
      mockDbUtils.getWordsForReview.mockResolvedValue([
        { id: 'test', lookup_count: 0 },
      ]);

      const result = await progressService.getWordsForReview();

      expect(result[0].lookupCount).toBe(0);
    });

    it('should handle very large lookup counts', async () => {
      mockDbUtils.getWordsForReview.mockResolvedValue([
        { id: 'test', lookup_count: 999999 },
      ]);

      const result = await progressService.getWordsForReview();

      expect(result[0].lookupCount).toBe(999999);
    });

    it('should handle special characters in word IDs', async () => {
      mockDbUtils.getWordsForReview.mockResolvedValue([
        { id: '特殊字符!@#', lookup_count: 5 },
      ]);

      const result = await progressService.getWordsForReview();

      expect(result[0].word).toBe('特殊字符!@#');
    });

    it('should handle date range with negative timestamps', async () => {
      mockDbUtils.getDailyStats.mockResolvedValue([]);

      const result = await progressService.getDailyStats(-1, -1);

      expect(result).toEqual([]);
    });

    it('should handle date range with very large timestamps', async () => {
      mockDbUtils.getDailyStats.mockResolvedValue([]);

      const result = await progressService.getDailyStats(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

      expect(result).toEqual([]);
    });

    it('should handle badges with 100% progress but not unlocked', async () => {
      const badges = [
        {
          id: 'test',
          name: 'Test',
          description: 'Test badge',
          criteria: 'Test criteria',
          target: 100,
          current: 100,
          isUnlocked: false, // Edge case: should be true but isn't
        },
      ];
      mockDbUtils.getBadgeProgress.mockResolvedValue(badges);

      const result = await progressService.getBadgeProgress();

      expect(result[0].current).toBe(100);
      expect(result[0].isUnlocked).toBe(false);
    });

    it('should handle streak with negative values', async () => {
      mockDbUtils.getReadingStreak.mockResolvedValue({
        currentStreak: -1,
        longestStreak: -5,
      });

      const result = await progressService.getReadingStreak();

      expect(result.currentStreak).toBe(-1);
      expect(result.longestStreak).toBe(-5);
    });

    it('should handle empty string word IDs', async () => {
      mockDbUtils.getWordsForReview.mockResolvedValue([
        { id: '', lookup_count: 5 },
      ]);

      const result = await progressService.getWordsForReview();

      expect(result[0].word).toBe('');
    });

    it('should handle undefined/null values in stats', async () => {
      mockDbUtils.getOverallLearningStats.mockResolvedValue({
        totalVocabularyExposed: undefined,
        totalVocabularyKnown: null,
        totalArticlesRead: 0,
      });

      const result = await progressService.getOverallLearningStats();

      expect(result.totalVocabularyExposed).toBeUndefined();
      expect(result.totalVocabularyKnown).toBeNull();
    });
  });
});
