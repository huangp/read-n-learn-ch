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
echo "🏗️  Step 3: Rebuilding iOS..."
npx expo prebuild --clean --platform ios
if [ $? -ne 0 ]; then
  echo "❌ prebuild failed"
  exit 1
fi
echo "✅ iOS rebuilt"

echo ""
echo "📱 Step 4: Starting app..."
npm run ios


