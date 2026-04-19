import { OpenAPI, AuthenticationService, StorageService, VocabularyService, DocumentExtractionService, BackupService } from './generated';
import { TokenStorage } from './tokenStorage';
import { DeviceInfoService } from './deviceInfo';
import type { KeyRequest } from './generated/models/KeyRequest';
import type { ExportBackupRequest } from './generated/models/ExportBackupRequest';

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
    OpenAPI.TOKEN = async (options) => {
      // /key endpoint is unauthenticated - skip auth
      if (options?.url === '/key') return '';

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

      // Call /key endpoint without authentication
      // Our TOKEN resolver returns '' for /key, so no auth header is sent
      const response = await AuthenticationService.getApiKey(keyRequest);

      if (!response.apiKey || !response.expiresAt) {
        throw new Error('Invalid API key response');
      }

      await TokenStorage.saveToken(response.apiKey, response.expiresAt);
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
  // Backup API Methods
  // ====================

  /**
   * Export backup data to cloud storage
   */
  static async exportBackup(appUserId: string, backupData: Record<string, unknown>) {
    this.initialize();
    const request: ExportBackupRequest = { appUserId, backupData };
    return BackupService.exportBackup(request);
  }

  /**
   * Import backup data from cloud storage
   */
  static async importBackup(appUserId: string) {
    this.initialize();
    return BackupService.importBackup(appUserId);
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
