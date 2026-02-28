#!/bin/bash

echo "🧹 Step 1: Cleaning up..."
killall node 2>/dev/null
killall Simulator 2>/dev/null
rm -rf .expo node_modules ios android package-lock.json
echo "✅ Cleanup complete"

echo ""
echo "📦 Step 2: Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
  echo "❌ npm install failed"
  exit 1
fi
echo "✅ Dependencies installed"

echo ""
echo "📖 Step 2b: Building dictionary data..."
npm run build:dict
if [ $? -ne 0 ]; then
  echo "⚠️  Dictionary build failed (app will still work, but lookups will be limited)"
fi
echo "✅ Dictionary built"

echo ""
echo "🏗️  Step 3: Rebuilding iOS..."
npx expo prebuild --clean --platform ios
if [ $? -ne 0 ]; then
  echo "❌ prebuild failed"
  exit 1
fi
echo "✅ iOS rebuilt"

echo ""
echo "📱 Step 4: Building and launching app..."

# Xcode 26 has issues resolving specific simulator device IDs via expo run:ios.
# Work around by building with generic simulator destination and installing manually.

# Ensure a simulator is booted (prefer iPhone)
BOOTED_UDID=$(xcrun simctl list devices booted -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if d.get('state') == 'Booted':
            print(d['udid'])
            sys.exit(0)
" 2>/dev/null)

if [ -z "$BOOTED_UDID" ]; then
  echo "No simulator booted. Booting iPhone 17 Pro..."
  UDID=$(xcrun simctl list devices available -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if 'iPhone' in d.get('name', '') and d.get('isAvailable', False):
            print(d['udid'])
            sys.exit(0)
" 2>/dev/null)
  if [ -z "$UDID" ]; then
    echo "❌ No iPhone simulator found"
    exit 1
  fi
  xcrun simctl boot "$UDID"
  open -a Simulator
  sleep 5
fi

echo "Building with xcodebuild..."
xcodebuild -workspace ios/ReadLearnChinese.xcworkspace \
  -configuration Debug \
  -scheme ReadLearnChinese \
  -destination 'generic/platform=iOS Simulator' \
  -quiet
if [ $? -ne 0 ]; then
  echo "❌ xcodebuild failed"
  exit 1
fi
echo "✅ Build succeeded"

# Find the built app
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/ReadLearnChinese-*/Build/Products/Debug-iphonesimulator/ReadLearnChinese.app -maxdepth 0 2>/dev/null | head -1)
if [ -z "$APP_PATH" ]; then
  echo "❌ Could not find built app"
  exit 1
fi

echo "Installing on simulator..."
xcrun simctl install booted "$APP_PATH"

echo "Launching app..."
xcrun simctl launch booted com.github.huangp.readnlearnch

echo ""
echo "Starting Metro bundler..."
npx expo start --dev-client


