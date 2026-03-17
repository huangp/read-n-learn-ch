import { ProgressDBUtils, DailyStats, OverallLearningStats, ReadingStreak, BadgeProgress, HSKLevelProgress } from '../../utils/database/progress';
import { progressService } from '../progressService';

// Mock the database module
jest.mock('../../utils/database/progress');

describe('progressService', () => {
  let mockDbUtils: jest.Mocked<ProgressDBUtils>;

  beforeEach(() => {
    // Reset the singleton instance
    (progressService as any).dbUtils = null;
    
    // Create mock database utilities
    mockDbUtils = {
      getWordsForReview: jest.fn(),
      getProblemWords: jest.fn(),
      getDailyStats: jest.fn(),
      getOverallLearningStats: jest.fn(),
      getReadingStreak: jest.fn(),
      getBadgeProgress: jest.fn(),
      getHSKProgress: jest.fn(),
    } as unknown as jest.Mocked<ProgressDBUtils>;

    // Mock the static create method
    (ProgressDBUtils.create as jest.Mock).mockResolvedValue(mockDbUtils);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWordsForReview', () => {
    it('should return mapped vocabulary items on success', async () => {
      const mockWords = [
        { id: '你好', lookup_count: 5 },
        { id: '中国', lookup_count: 3 },
      ];
      mockDbUtils.getWordsForReview.mockResolvedValue(mockWords);

      const result = await progressService.getWordsForReview(20);

      expect(result).toEqual([
        { word: '你好', lookupCount: 5 },
        { word: '中国', lookupCount: 3 },
      ]);
      expect(mockDbUtils.getWordsForReview).toHaveBeenCalledWith(20);
    });

    it('should return empty array when no words found', async () => {
      mockDbUtils.getWordsForReview.mockResolvedValue([]);

      const result = await progressService.getWordsForReview(20);

      expect(result).toEqual([]);
    });

    it('should use default limit of 20 when not specified', async () => {
      mockDbUtils.getWordsForReview.mockResolvedValue([]);

      await progressService.getWordsForReview();

      expect(mockDbUtils.getWordsForReview).toHaveBeenCalledWith(20);
    });
  });

  describe('getProblemWords', () => {
    it('should return mapped problem words on success', async () => {
      const mockWords = [
        { id: '学习', lookup_count: 10 },
        { id: '汉字', lookup_count: 8 },
      ];
      mockDbUtils.getProblemWords.mockResolvedValue(mockWords);

      const result = await progressService.getProblemWords(10);

      expect(result).toEqual([
        { word: '学习', lookupCount: 10 },
        { word: '汉字', lookupCount: 8 },
      ]);
      expect(mockDbUtils.getProblemWords).toHaveBeenCalledWith(10);
    });

    it('should return empty array when no problem words found', async () => {
      mockDbUtils.getProblemWords.mockResolvedValue([]);

      const result = await progressService.getProblemWords(20);

      expect(result).toEqual([]);
    });
  });

  describe('getDailyStats', () => {
    it('should return daily stats for date range', async () => {
      const mockStats: DailyStats[] = [
        {
          date: '2024-01-15',
          vocabularyKnown: 5,
          articlesRead: 2,
          vocabularyExposed: 100,
        },
        {
          date: '2024-01-16',
          vocabularyKnown: 3,
          articlesRead: 1,
          vocabularyExposed: 50,
        },
      ];
      mockDbUtils.getDailyStats.mockResolvedValue(mockStats);

      const startDate = new Date('2024-01-15').getTime();
      const endDate = new Date('2024-01-16').getTime();
      
      const result = await progressService.getDailyStats(startDate, endDate);

      expect(result).toEqual(mockStats);
      expect(mockDbUtils.getDailyStats).toHaveBeenCalledWith(startDate, endDate);
    });

    it('should return empty array when no stats for date range', async () => {
      mockDbUtils.getDailyStats.mockResolvedValue([]);

      const result = await progressService.getDailyStats(0, 0);

      expect(result).toEqual([]);
    });
  });

  describe('getOverallLearningStats', () => {
    it('should return overall stats on success', async () => {
      const mockStats: OverallLearningStats = {
        totalVocabularyExposed: 1000,
        totalVocabularyKnown: 500,
        totalArticlesRead: 50,
      };
      mockDbUtils.getOverallLearningStats.mockResolvedValue(mockStats);

      const result = await progressService.getOverallLearningStats();

      expect(result).toEqual(mockStats);
    });

    it('should return default values when stats are empty', async () => {
      const mockStats: OverallLearningStats = {
        totalVocabularyExposed: 0,
        totalVocabularyKnown: 0,
        totalArticlesRead: 0,
      };
      mockDbUtils.getOverallLearningStats.mockResolvedValue(mockStats);

      const result = await progressService.getOverallLearningStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('getReadingStreak', () => {
    it('should return current and longest streak', async () => {
      const mockStreak: ReadingStreak = {
        currentStreak: 7,
        longestStreak: 14,
      };
      mockDbUtils.getReadingStreak.mockResolvedValue(mockStreak);

      const result = await progressService.getReadingStreak();

      expect(result).toEqual(mockStreak);
    });

    it('should return zero streaks when no reading activity', async () => {
      const mockStreak: ReadingStreak = {
        currentStreak: 0,
        longestStreak: 0,
      };
      mockDbUtils.getReadingStreak.mockResolvedValue(mockStreak);

      const result = await progressService.getReadingStreak();

      expect(result).toEqual(mockStreak);
    });
  });

  describe('getBadgeProgress', () => {
    it('should return all badges with progress', async () => {
      const mockBadges: BadgeProgress[] = [
        {
          id: 'first_steps',
          name: '🏃‍♂️ First Steps',
          description: 'Read your first article',
          criteria: 'Read 1 article',
          target: 1,
          current: 1,
          isUnlocked: true,
        },
        {
          id: 'bookworm',
          name: '📚 Bookworm',
          description: 'Read 10 articles',
          criteria: 'Read 10 articles',
          target: 10,
          current: 5,
          isUnlocked: false,
        },
      ];
      mockDbUtils.getBadgeProgress.mockResolvedValue(mockBadges);

      const result = await progressService.getBadgeProgress();

      expect(result).toEqual(mockBadges);
    });

    it('should return empty array when no badges defined', async () => {
      mockDbUtils.getBadgeProgress.mockResolvedValue([]);

      const result = await progressService.getBadgeProgress();

      expect(result).toEqual([]);
    });

    it('should include HSK badges when available', async () => {
      const mockBadges: BadgeProgress[] = [
        {
          id: 'hsk_1',
          name: '🥇 HSK 1 Master',
          description: 'Master all HSK 1 vocabulary',
          criteria: 'Master 100% of HSK 1',
          target: 100,
          current: 75,
          isUnlocked: false,
        },
      ];
      mockDbUtils.getBadgeProgress.mockResolvedValue(mockBadges);

      const result = await progressService.getBadgeProgress();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hsk_1');
    });
  });

  describe('initialization', () => {
    it('should initialize database only once', async () => {
      mockDbUtils.getWordsForReview.mockResolvedValue([]);
      mockDbUtils.getProblemWords.mockResolvedValue([]);
      mockDbUtils.getDailyStats.mockResolvedValue([]);

      // Call multiple methods
      await progressService.getWordsForReview();
      await progressService.getProblemWords();
      await progressService.getDailyStats(0, 0);

      // ProgressDBUtils.create should only be called once
      expect(ProgressDBUtils.create).toHaveBeenCalledTimes(1);
    });

    it('should reuse existing database instance on subsequent calls', async () => {
      mockDbUtils.getWordsForReview.mockResolvedValue([]);

      // First call initializes
      await progressService.getWordsForReview();
      expect(ProgressDBUtils.create).toHaveBeenCalledTimes(1);

      // Second call should reuse
      await progressService.getWordsForReview();
      expect(ProgressDBUtils.create).toHaveBeenCalledTimes(1);
    });
  });
});
