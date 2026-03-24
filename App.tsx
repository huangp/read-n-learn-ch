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
import { loadInitialArticles } from './src/services/initialArticles';
import { StorageService } from './src/services/storage';

export default function App() {
  // Preload dictionary data at startup so lookups are instant
  useEffect(() => {
    const init = async () => {
      // Dictionary loading is independent — start in parallel
      loadCoreDictionary().then(() => loadFullDictionary());

      // Database must be ready before anything that writes to it
      await CharacterRecognitionService.initialize();

      // These can run concurrently now that the DB is ready
      const articles = await StorageService.getAllArticles();
      await Promise.allSettled([
        useSubscriptionStore.getState().initialize(),
        ArticleTagsService.refreshTagIndex(articles),
        loadInitialArticles(),
      ]);
    };

    init().catch(error => {
      console.error('Failed to initialize app:', error);
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

