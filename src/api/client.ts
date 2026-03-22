import { OpenAPI, AuthenticationService, StorageService, VocabularyService, DocumentExtractionService } from './generated';
import { TokenStorage } from './tokenStorage';
import { DeviceInfoService } from './deviceInfo';
import type { KeyRequest } from './generated/models/KeyRequest';

// Get API base URL from environment
// For local development: set in .env file (defaults to localhost:3000)
// For EAS builds: configured in eas.json per build profile
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * API Client with automatic token management
 * 
 * Usage:
 * ```typescript
 * import { ApiClient } from './api/client';
 * 
 * // List objects (automatically handles authentication)
 * const objects = await ApiClient.listObjects();
 * 
 * // Lookup vocabulary
 * const lookup = await ApiClient.lookupVocabulary('你好');
 * ```
 */
export class ApiClient {
  private static isInitialized = false;
  private static isRefreshing = false;
  private static refreshPromise: Promise<void> | null = null;

  /**
   * Initialize the API client with base URL and token resolver
   */
  static initialize(): void {
    if (this.isInitialized) return;

    OpenAPI.BASE = API_BASE_URL;
    OpenAPI.TOKEN = async () => {
      await this.ensureValidToken();
      const stored = await TokenStorage.getToken();
      return stored?.token ?? '';
    };

    this.isInitialized = true;
  }

  /**
   * Ensure we have a valid token, refreshing if necessary
   */
  private static async ensureValidToken(): Promise<void> {
    const stored = await TokenStorage.getToken();
    
    // Check if we need to refresh (no token or expired with 5 min buffer)
    if (!stored || TokenStorage.isTokenExpired(stored.expiresAt, 5)) {
      await this.refreshToken();
    }
  }

  /**
   * Refresh the API token by calling the /key endpoint
   */
  private static async refreshToken(): Promise<void> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefreshToken();

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private static async doRefreshToken(): Promise<void> {
    try {
      const deviceInfo = await DeviceInfoService.getDeviceInfo();
      
      const keyRequest: KeyRequest = {
        deviceId: deviceInfo.deviceId,
        bundleId: deviceInfo.bundleId,
        appVersion: deviceInfo.appVersion,
      };

      // Temporarily disable token for /key endpoint (unauthenticated)
      // The /key endpoint is defined with security: [] in the OpenAPI spec,
      // but the generated client doesn't respect this, so we manually disable auth
      const originalToken = OpenAPI.TOKEN;
      OpenAPI.TOKEN = undefined;

      try {
        // Call /key endpoint without authentication
        const response = await AuthenticationService.getApiKey(keyRequest);

        if (!response.apiKey || !response.expiresAt) {
          throw new Error('Invalid API key response');
        }

        await TokenStorage.saveToken(response.apiKey, response.expiresAt);
      } finally {
        // Restore token resolver
        OpenAPI.TOKEN = originalToken;
      }
    } catch (error) {
      console.error('[ApiClient] Failed to refresh token:', error);
      await TokenStorage.deleteToken();
      throw error;
    }
  }

  // ====================
  // Storage API Methods
  // ====================

  /**
   * List all objects in storage
   */
  static async listObjects() {
    this.initialize();
    return StorageService.listObjects();
  }

  /**
   * Get an object by key
   */
  static async getObject(key: string) {
    this.initialize();
    return StorageService.getObject(key);
  }

  /**
   * Update an object
   */
  static async putObject(key: string, title?: string, body?: string) {
    this.initialize();
    return StorageService.putObject(key, { title, body });
  }

  // ====================
  // Vocabulary API Methods
  // ====================

  /**
   * Lookup a Chinese word or character
   */
  static async lookupVocabulary(vocabulary: string) {
    this.initialize();
    return VocabularyService.lookupVocabulary({ vocabulary });
  }

  // ====================
  // Document Extraction API Methods
  // ====================

  /**
   * Upload documents for text extraction
   */
  static async extractDocuments(files: File[] | Blob[]) {
    this.initialize();
    return DocumentExtractionService.extractDocuments({ file: files as any });
  }

  /**
   * Get extraction job status
   */
  static async getExtractionStatus(jobId: string) {
    this.initialize();
    return DocumentExtractionService.getExtractionStatus(jobId);
  }

  // ====================
  // Utility Methods
  // ====================

  /**
   * Clear the stored API token (logout)
   */
  static async clearToken(): Promise<void> {
    await TokenStorage.deleteToken();
  }

  /**
   * Check if API is properly configured
   */
  static isConfigured(): boolean {
    return !!API_BASE_URL && API_BASE_URL.length > 0;
  }

  /**
   * Get the current API base URL (for debugging)
   */
  static getBaseUrl(): string | undefined {
    return API_BASE_URL;
  }
}
