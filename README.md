# Read & Learn Chinese

A cross-platform React Native app for storing and reading Chinese text articles, optimized for both iPhone and iPad.

## Features

- 📚 Store Chinese text articles locally
- 🔍 Search through your articles
- ✏️ Create and edit articles
- 📷 Camera scan to capture text from images
- 📄 Import documents (PDF, TXT)
- 🖼️ Import images for text extraction
- 📊 Chinese character count tracking
- 📱 Responsive layout for iPhone and iPad
- ⚙️ Settings screen accessible from the header

## Tech Stack

- **Framework**: Expo SDK 54 + React Native 0.81.5
- **Language**: TypeScript
- **React**: 19.1.0
- **Navigation**: React Navigation (Stack)
- **Storage**: AsyncStorage (local)
- **Camera**: expo-camera
- **File Handling**: expo-document-picker, expo-file-system, expo-image-picker

## Project Structure

```
read-n-learn-ch/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/
│   │   ├── HomeScreen.tsx          # Article list with search
│   │   ├── ArticleDetailScreen.tsx # View article
│   │   ├── ArticleEditorScreen.tsx # Create/edit articles
│   │   ├── CameraScreen.tsx        # Camera scan
│   │   └── SettingsScreen.tsx      # App settings
│   ├── navigation/
│   │   └── AppNavigator.tsx  # Stack navigation config
│   ├── services/
│   │   ├── storage.ts        # Article storage (AsyncStorage)
│   │   └── fileProcessing.ts # File import & text extraction
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Helper functions
│   └── constants/            # App constants
├── assets/                   # Images and fonts
├── App.tsx                   # App root component
├── index.ts                  # Entry point
├── app.json                  # Expo configuration
├── babel.config.js           # Babel configuration
├── metro.config.js           # Metro bundler configuration
├── restart-app.sh            # Full clean rebuild script
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- Xcode (for iOS Simulator on Mac)
- Expo CLI (bundled with `npx`)

### Installation

```bash
cd read-n-learn-ch
npm install
```

### Full Clean Rebuild (first time or after dependency changes)

```bash
./restart-app.sh
```

This script will:
1. Kill running processes
2. Remove `node_modules`, `ios`, `android`, `package-lock.json`
3. Run `npm install`
4. Run `npx expo prebuild --clean --platform ios`
5. Run `npm run ios`

### Running the App

#### Option 1: Build and run on iOS Simulator

```bash
npm run ios
```

> Use this when running for the first time or after changing native dependencies.

#### Option 2: Start Metro dev server only (recommended for daily development)

```bash
npx expo start
```

Then press **`i`** to open the app in the iOS Simulator.

> This is much faster — it skips the Xcode rebuild and serves the JS bundle directly. Code changes auto-refresh via **Fast Refresh**.

#### Option 3: Run on a physical device with Expo Go

1. Install **Expo Go** from the App Store
2. Run `npx expo start`
3. Scan the QR code with your iPhone/iPad camera

> Note: Some native features (camera, etc.) may require a development build instead of Expo Go.

### When to Use Each Approach

| Scenario | Command |
|----------|---------|
| First time setup | `./restart-app.sh` |
| Changed `package.json` or `app.json` | `./restart-app.sh` |
| Day-to-day coding | `npx expo start` → press `i` |
| Testing on physical device | `npx expo start` → scan QR |

## Screens

1. **Home** — Article list with search, pull-to-refresh, and Settings button
2. **Article Detail** — View article with Chinese character count
3. **Article Editor** — Create/edit articles, import files, camera scan
4. **Camera** — Capture images for text extraction (multi-image support)
5. **Settings** — App info and data management

## Data Model

```typescript
interface Article {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  source?: string;
  wordCount?: number;  // Chinese character count
}
```

## Supported File Imports

| Format | Status |
|--------|--------|
| Plain text (.txt) | ✅ Supported |
| PDF (.pdf) | ✅ Basic text extraction |
| DOCX (.docx) | 🚧 Coming soon |
| Image OCR | 🚧 Coming soon |

## iPad Support

The app is configured for iPad with:
- `supportsTablet: true` in `app.json`
- Responsive grid layout (2 columns on iPad, 1 on iPhone)
- Support for all orientations (portrait/landscape)
- Split-screen / multitasking support (`requireFullScreen: false`)

## License

MIT
