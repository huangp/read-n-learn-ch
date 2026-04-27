# Read & Learn Chinese

A cross-platform React Native app for storing and reading Chinese text articles, optimized for both iPhone and iPad.

## Features

- 📚 Store Chinese text articles locally
- 🔍 Search through your articles
- ✏️ Create and edit articles
- 📖 **Tap-to-lookup** — tap any word to see pinyin, definitions, HSK level, and character breakdown
- 📕 **Offline dictionary** — 124k+ entries from CC-CEDICT, HSK 1-6 tagged, no internet needed
- 🔤 **Context-aware word segmentation** — powered by segmentit (pure JS, runs locally)
- 📷 Camera scan to capture text from images
- 📄 Import documents (PDF, DOCX, TXT)
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
- **Dictionary**: CC-CEDICT (124k+ entries, offline)
- **Word Segmentation**: segmentit (pure JS, context-aware)
- **Pinyin**: pinyin (tone-marked conversion)
- **Camera**: expo-camera
- **File Handling**: expo-document-picker, expo-file-system, expo-image-picker

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
npm run build:dict   # Downloads CC-CEDICT and builds the offline dictionary (~124k entries)
```

> The `build:dict` step downloads the [CC-CEDICT](https://cc-cedict.org/) Chinese-English dictionary, cross-references HSK 1-6 word lists, and generates two JSON files under `assets/dict/`. This only needs to be run once (or when you want to update the dictionary data).

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


If you only change npm packages:
```npm install
cd ios && pod install && cd ..
npx expo run:ios
```
Or if npx expo run:ios has the Xcode 26 destination issues from before, use the approach from your restart-app.sh:
```npm install
cd ios && pod install && cd ..
xcodebuild -workspace ios/*.xcworkspace -scheme YourApp -destination 'generic/platform=iOS Simulator' -quiet
xcrun simctl install booted ios/build/Build/Products/Debug-iphonesimulator/YourApp.app
xcrun simctl launch booted com.yourapp.bundleid
npx expo start
```
### Quick reference:

| Change | Command |
|--------|---------|
| JS/TS code only | Metro hot-reloads automatically |
| npm packages (JS only) | npm install then restart Metro |
| npm packages (with native code) | npm install && cd ios && pod install && cd .. && restart-app.sh |
| Native module changes | restart-app.sh |
| Full clean rebuild | restart-app.sh (if it runs npx expo prebuild --clean) |

Key thing to remember:
If the new npm package has native iOS dependencies (pods), you must run pod install after npm install. If it's a JS-only package, just restarting Metro is enough.


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

## Supported File Imports

| Format | Status |
|--------|----|
| Plain text (.txt) | ✅ Supported |
| PDF (.pdf) | ✅ Basic text extraction |
| DOCX (.docx) | ✅ Basic text extraction |
| Image OCR | ✅ Basic text extraction |

## iPad Support

The app is configured for iPad with:
- `supportsTablet: true` in `app.json`
- Responsive grid layout (2 columns on iPad, 1 on iPhone)
- Support for all orientations (portrait/landscape)
- Split-screen / multitasking support (`requireFullScreen: false`)

## License

MIT
