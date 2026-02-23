import AsyncStorage from '@react-native-async-storage/async-storage';

const DEBUG_MODE_KEY = '@debug_mode_enabled';

class DebugService {
  private static isEnabled: boolean = false;

  static async initialize() {
    try {
      const value = await AsyncStorage.getItem(DEBUG_MODE_KEY);
      this.isEnabled = value === 'true';
    } catch (error) {
      console.error('Error initializing debug service:', error);
    }
  }

  static async isDebugMode(): Promise<boolean> {
    if (!this.isEnabled) {
      try {
        const value = await AsyncStorage.getItem(DEBUG_MODE_KEY);
        this.isEnabled = value === 'true';
      } catch (error) {
        return false;
      }
    }
    return this.isEnabled;
  }

  static log(category: string, message: string, data?: any) {
    if (this.isEnabled) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${category}] ${message}`;
      
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }

  static logError(category: string, message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${category}] ERROR: ${message}`;
    
    if (error !== undefined) {
      console.error(logMessage, error);
    } else {
      console.error(logMessage);
    }
  }
}

export default DebugService;