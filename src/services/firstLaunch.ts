import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_SEEN_ONBOARDING_KEY = '@has_seen_onboarding';

export class FirstLaunchService {
  /**
   * Check if the user has completed the onboarding flow
   */
  static async hasSeenOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY);
      return value === 'true';
    } catch (error) {
      console.error('[FirstLaunchService] Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark the onboarding as completed
   */
  static async markOnboardingSeen(): Promise<void> {
    try {
      await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true');
    } catch (error) {
      console.error('[FirstLaunchService] Error marking onboarding as seen:', error);
    }
  }

  /**
   * Reset onboarding status (for testing/debugging purposes)
   */
  static async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HAS_SEEN_ONBOARDING_KEY);
    } catch (error) {
      console.error('[FirstLaunchService] Error resetting onboarding:', error);
    }
  }
}
