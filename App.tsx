import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { loadCoreDictionary, loadFullDictionary } from './src/services/dictionaryLoader';
import CharacterRecognitionService from './src/services/characterRecognition';

export default function App() {
  // Preload dictionary data at startup so lookups are instant
  useEffect(() => {
    loadCoreDictionary().then(() => loadFullDictionary());
    
    // Initialize character recognition database
    CharacterRecognitionService.initialize().catch(error => {
      console.error('Failed to initialize character recognition service:', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

