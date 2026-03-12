# API Configuration

## Environment Variables

Add the following to your `.env` file or environment configuration:

```bash
# API Base URL (replace YOUR_API_ID and region with your actual values)
EXPO_PUBLIC_API_BASE_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
```

## Setup Instructions

1. **Set your API Base URL:**
   - Replace `YOUR_API_ID` with your actual API Gateway ID
   - Replace `us-east-1` with your AWS region if different

2. **Regenerate API client (if API spec changes):**
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
