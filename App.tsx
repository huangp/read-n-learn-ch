import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MenuProvider } from 'react-native-popup-menu';
import { PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { loadCoreDictionary, loadFullDictionary } from './src/services/dictionaryLoader';
import CharacterRecognitionService from './src/services/characterRecognition';
import { ArticleTagsService } from './src/services/articleTags';
import { useSubscriptionStore } from './src/store/subscriptionStore';

export default function App() {
  // Preload dictionary data at startup so lookups are instant
  useEffect(() => {
    loadCoreDictionary().then(() => loadFullDictionary());
    
    // Initialize character recognition database
    CharacterRecognitionService.initialize().catch(error => {
      console.error('Failed to initialize character recognition service:', error);
    });
    
    // Initialize subscription manager (RevenueCat)
    const initializeSubscription = useSubscriptionStore.getState().initialize;
    initializeSubscription().catch(error => {
      console.error('Failed to initialize subscription service:', error);
    });
    
    // Initialize article tags index
    ArticleTagsService.refreshTagIndex().catch(error => {
      console.error('Failed to initialize article tags index:', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <MenuProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </MenuProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

