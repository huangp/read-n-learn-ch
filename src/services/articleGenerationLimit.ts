import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'article-generation-limit';
const MONTHLY_LIMIT = 10;

interface LimitRecord {
  count: number;
  monthKey: string;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

class ArticleGenerationLimitService {
  /**
   * Get current usage count for this month.
   */
  async getCurrentUsage(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return 0;

      const record: LimitRecord = JSON.parse(stored);
      const currentMonth = getCurrentMonthKey();

      if (record.monthKey !== currentMonth) {
        // Month changed, reset counter
        return 0;
      }

      return record.count;
    } catch (error) {
      console.error('[ArticleGenerationLimit] Error reading limit:', error);
      return 0;
    }
  }

  /**
   * Check if user has remaining quota.
   */
  async hasRemainingQuota(): Promise<boolean> {
    const usage = await this.getCurrentUsage();
    return usage < MONTHLY_LIMIT;
  }

  /**
   * Get remaining count.
   */
  async getRemainingCount(): Promise<number> {
    const usage = await this.getCurrentUsage();
    return Math.max(0, MONTHLY_LIMIT - usage);
  }

  /**
   * Increment usage count.
   */
  async incrementUsage(): Promise<void> {
    try {
      const currentMonth = getCurrentMonthKey();
      const stored = await AsyncStorage.getItem(STORAGE_KEY);

      let record: LimitRecord;
      if (stored) {
        record = JSON.parse(stored);
        if (record.monthKey !== currentMonth) {
          record = { count: 0, monthKey: currentMonth };
        }
      } else {
        record = { count: 0, monthKey: currentMonth };
      }

      record.count += 1;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (error) {
      console.error('[ArticleGenerationLimit] Error incrementing limit:', error);
    }
  }

  /**
   * Reset usage (mainly for testing).
   */
  async resetUsage(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[ArticleGenerationLimit] Error resetting limit:', error);
    }
  }
}

export default new ArticleGenerationLimitService();
