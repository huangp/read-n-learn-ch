import { ApiClient } from '../client';
import { TokenStorage } from '../tokenStorage';
import { OpenAPI, AuthenticationService } from '../generated';
import { DeviceInfoService } from '../deviceInfo';

// Mock dependencies
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../deviceInfo', () => ({
  DeviceInfoService: {
    getDeviceInfo: jest.fn(),
  },
}));

jest.mock('../generated', () => ({
  OpenAPI: {
    BASE: '',
    TOKEN: undefined,
  },
  AuthenticationService: {
    getApiKey: jest.fn(),
  },
  StorageService: {},
  VocabularyService: {},
  DocumentExtractionService: {},
  BackupService: {},
}));

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset ApiClient initialization state
    (ApiClient as any).isInitialized = false;
    (ApiClient as any).isRefreshing = false;
    (ApiClient as any).refreshPromise = null;
  });

  describe('TOKEN resolver', () => {
    it('should return empty string for /key endpoint', async () => {
      ApiClient.initialize();

      const tokenResolver = OpenAPI.TOKEN as Function;
      const result = await tokenResolver({ url: '/key' });

      expect(result).toBe('');
    });

    it('should return valid token for non-/key endpoints', async () => {
      const mockToken = 'valid-api-token';
      jest.spyOn(TokenStorage, 'getToken').mockResolvedValue({
        token: mockToken,
        expiresAt: Date.now() + 3600000, // 1 hour from now
      });
      jest.spyOn(TokenStorage, 'isTokenExpired').mockReturnValue(false);

      ApiClient.initialize();

      const tokenResolver = OpenAPI.TOKEN as Function;
      const result = await tokenResolver({ url: '/lookup' });

      expect(result).toBe(mockToken);
    });

    it('should trigger token refresh when token is expired and return new token', async () => {
      const expiredToken = 'expired-token';
      const mockApiKey = 'new-api-key';
      const mockExpiresAt = Date.now() + 3600000;

      // First call returns expired token, subsequent calls return new token
      let callCount = 0;
      jest.spyOn(TokenStorage, 'getToken').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            token: expiredToken,
            expiresAt: Date.now() - 1000, // Expired
          });
        }
        return Promise.resolve({
          token: mockApiKey,
          expiresAt: mockExpiresAt,
        });
      });

      jest.spyOn(TokenStorage, 'isTokenExpired').mockReturnValue(true);
      jest.spyOn(TokenStorage, 'saveToken').mockResolvedValue(undefined);

      (DeviceInfoService.getDeviceInfo as jest.Mock).mockResolvedValue({
        deviceId: 'test-device',
        bundleId: 'com.test.app',
        appVersion: '1.0.0',
      });

      (AuthenticationService.getApiKey as jest.Mock).mockResolvedValue({
        apiKey: mockApiKey,
        expiresAt: mockExpiresAt,
      });

      ApiClient.initialize();

      const tokenResolver = OpenAPI.TOKEN as Function;
      const result = await tokenResolver({ url: '/lookup' });

      expect(AuthenticationService.getApiKey).toHaveBeenCalled();
      expect(TokenStorage.saveToken).toHaveBeenCalledWith(mockApiKey, mockExpiresAt);
      expect(result).toBe(mockApiKey);
    });
  });

  describe('concurrent requests during token refresh', () => {
    it('should not return undefined to concurrent requests', async () => {
      const mockApiKey = 'new-api-key';
      const mockExpiresAt = Date.now() + 3600000;
      let resolveKeyRequest: Function;
      const keyRequestPromise = new Promise((resolve) => {
        resolveKeyRequest = resolve;
      });

      let getTokenCallCount = 0;
      jest.spyOn(TokenStorage, 'getToken').mockImplementation(() => {
        getTokenCallCount++;
        if (getTokenCallCount === 1) {
          return Promise.resolve(null); // No token initially
        }
        return Promise.resolve({
          token: mockApiKey,
          expiresAt: mockExpiresAt,
        });
      });

      jest.spyOn(TokenStorage, 'saveToken').mockResolvedValue(undefined);

      (DeviceInfoService.getDeviceInfo as jest.Mock).mockResolvedValue({
        deviceId: 'test-device',
        bundleId: 'com.test.app',
        appVersion: '1.0.0',
      });

      (AuthenticationService.getApiKey as jest.Mock).mockImplementation(() => keyRequestPromise);

      ApiClient.initialize();

      const tokenResolver = OpenAPI.TOKEN as Function;

      // Start first request that triggers refresh
      const firstRequest = tokenResolver({ url: '/lookup' });

      // Immediately start second concurrent request
      // Before the fix, this would get undefined because TOKEN was temporarily set to undefined
      const secondRequest = tokenResolver({ url: '/lookup' });

      // Resolve the key request
      resolveKeyRequest!({
        apiKey: mockApiKey,
        expiresAt: mockExpiresAt,
      });

      const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest]);

      // Both should get the valid token, not undefined
      expect(firstResult).toBe(mockApiKey);
      expect(secondResult).toBe(mockApiKey);
      expect(AuthenticationService.getApiKey).toHaveBeenCalledTimes(1); // Only one key request
    });

    it('should handle multiple concurrent requests with expired token', async () => {
      const expiredToken = 'expired-token';
      const mockApiKey = 'refreshed-api-key';
      const mockExpiresAt = Date.now() + 3600000;

      let getTokenCallCount = 0;
      jest.spyOn(TokenStorage, 'getToken').mockImplementation(() => {
        getTokenCallCount++;
        if (getTokenCallCount === 1) {
          return Promise.resolve({
            token: expiredToken,
            expiresAt: Date.now() - 1000, // Expired
          });
        }
        return Promise.resolve({
          token: mockApiKey,
          expiresAt: mockExpiresAt,
        });
      });

      jest.spyOn(TokenStorage, 'isTokenExpired').mockReturnValue(true);
      jest.spyOn(TokenStorage, 'saveToken').mockResolvedValue(undefined);

      (DeviceInfoService.getDeviceInfo as jest.Mock).mockResolvedValue({
        deviceId: 'test-device',
        bundleId: 'com.test.app',
        appVersion: '1.0.0',
      });

      (AuthenticationService.getApiKey as jest.Mock).mockResolvedValue({
        apiKey: mockApiKey,
        expiresAt: mockExpiresAt,
      });

      ApiClient.initialize();

      const tokenResolver = OpenAPI.TOKEN as Function;

      // Fire multiple concurrent requests
      const requests = [
        tokenResolver({ url: '/lookup' }),
        tokenResolver({ url: '/objects' }),
        tokenResolver({ url: '/extract' }),
      ];

      const results = await Promise.all(requests);

      // All should get the valid token
      results.forEach((result) => {
        expect(result).toBe(mockApiKey);
      });

      // Only one key request should be made
      expect(AuthenticationService.getApiKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('token refresh error handling', () => {
    it('should clear token and throw on refresh failure', async () => {
      jest.spyOn(TokenStorage, 'getToken').mockResolvedValue(null);
      jest.spyOn(TokenStorage, 'deleteToken').mockResolvedValue(undefined);

      (DeviceInfoService.getDeviceInfo as jest.Mock).mockResolvedValue({
        deviceId: 'test-device',
        bundleId: 'com.test.app',
        appVersion: '1.0.0',
      });

      (AuthenticationService.getApiKey as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      ApiClient.initialize();

      const tokenResolver = OpenAPI.TOKEN as Function;

      await expect(tokenResolver({ url: '/lookup' })).rejects.toThrow('Network error');
      expect(TokenStorage.deleteToken).toHaveBeenCalled();
    });
  });
});
