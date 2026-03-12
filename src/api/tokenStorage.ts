import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'api_auth_token';
const TOKEN_EXPIRES_AT_KEY = 'api_token_expires_at';

interface StoredToken {
  token: string;
  expiresAt: number;
}

export class TokenStorage {
  static async saveToken(token: string, expiresAt: number): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
      await SecureStore.setItemAsync(TOKEN_EXPIRES_AT_KEY, expiresAt.toString(), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } catch (error) {
      console.error('[TokenStorage] Error saving token:', error);
      throw error;
    }
  }

  static async getToken(): Promise<StoredToken | null> {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const expiresAtStr = await SecureStore.getItemAsync(TOKEN_EXPIRES_AT_KEY);
      
      if (!token || !expiresAtStr) {
        return null;
      }
      
      return {
        token,
        expiresAt: parseInt(expiresAtStr, 10),
      };
    } catch (error) {
      console.error('[TokenStorage] Error retrieving token:', error);
      return null;
    }
  }

  static async deleteToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRES_AT_KEY);
    } catch (error) {
      console.error('[TokenStorage] Error deleting token:', error);
    }
  }

  static isTokenExpired(expiresAt: number, bufferMinutes: number = 5): boolean {
    const now = Date.now();
    const bufferMs = bufferMinutes * 60 * 1000;
    return now >= (expiresAt - bufferMs);
  }
}
