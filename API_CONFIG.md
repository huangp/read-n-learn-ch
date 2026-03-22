# API Configuration

## Environment Setup

This project uses different API URLs for development and production environments.

### Development (Local)

For local development with the iOS Simulator:

```bash
# Uses mock server on localhost:3000
npm run ios
# or
npx expo start --ios
```

**Configuration:** `.env` file
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Production (EAS Builds)

For production builds, the API URL is configured in `eas.json`:

| Build Profile | API URL | Use Case |
|--------------|---------|----------|
| `development` | http://localhost:3000 | Dev client with simulator |
| `development-device` | http://localhost:3000 | Dev client on physical device |
| `preview` | https://readnlearnch-api.huangandgong.com | TestFlight/Internal testing |
| `preview-simulator` | https://readnlearnch-api.huangandgong.com | Test production API on simulator |
| `production` | https://readnlearnch-api.huangandgong.com | App Store release |

## Build Commands

### Local Development
```bash
# Start mock server
npm run mock-server

# Run on iOS simulator (uses localhost:3000)
npm run ios
```

### EAS Cloud Builds
```bash
# Install EAS CLI (if not already installed)
npm install -g eas-cli

# Login to Expo
eas login

# Configure project (first time only)
eas build:configure

# Build for preview (TestFlight/Internal testing)
eas build --profile preview --platform ios

# Build for production (App Store)
eas build --profile production --platform ios

# Build for Android
eas build --profile production --platform android
```

## Setup Instructions

1. **Local Development:**
   - The `.env` file is already configured for localhost:3000
   - Start the mock server: `npm run mock-server`
   - Run the app: `npm run ios`

2. **Production API:**
   - The production URL is already configured in `eas.json`
   - No changes needed unless the API URL changes

3. **Regenerate API client (if API spec changes):**
   ```bash
   npm run generate:api
   ```

## Usage

```typescript
import { ApiClient } from './src/api';

// List all objects
const objects = await ApiClient.listObjects();

// Get a specific object
const article = await ApiClient.getObject('article-key');

// Lookup vocabulary
const definition = await ApiClient.lookupVocabulary('你好');

// Upload documents for extraction
const extractionJob = await ApiClient.extractDocuments([file1, file2]);

// Check extraction status
const status = await ApiClient.getExtractionStatus(jobId);
```

## Authentication

The API client automatically handles authentication:
- Stores API tokens securely in iOS Keychain / Android Keystore
- Automatically refreshes tokens 5 minutes before expiration
- Gets device info automatically from Expo APIs

## Token Management

```typescript
// Clear token (logout)
await ApiClient.clearToken();

// Check if API is configured
if (ApiClient.isConfigured()) {
  // API base URL is set
}
```
