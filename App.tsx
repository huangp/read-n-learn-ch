import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MenuProvider } from 'react-native-popup-menu';
import { PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { OnboardingModal } from './src/components/OnboardingModal';
import { FirstLaunchService } from './src/services/firstLaunch';
import { loadCoreDictionary, loadFullDictionary } from './src/services/dictionaryLoader';
import CharacterRecognitionService from './src/services/characterRecognition';
import { ArticleTagsService } from './src/services/articleTags';
import { useSubscriptionStore } from './src/store/subscriptionStore';
import { loadInitialArticles } from './src/services/initialArticles';
import { StorageService } from './src/services/storage';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Check if we need to show onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      const hasSeen = await FirstLaunchService.hasSeenOnboarding();
      if (!hasSeen) {
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, []);

  // Preload dictionary data at startup so lookups are instant
  useEffect(() => {
    const init = async () => {
      try {
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
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setInitError(
          error instanceof Error ? error.message : 'Failed to initialize app'
        );
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  const handleOnboardingComplete = async () => {
    setOnboardingComplete(true);
    await FirstLaunchService.markOnboardingSeen();
  };

  // Show loading screen if:
  // - Initializing AND (onboarding is done OR was already seen)
  if (isInitializing && (onboardingComplete || !showOnboarding)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5856D6" />
        <Text style={styles.loadingText}>Initializing app...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Show onboarding if:
  // - Should show onboarding AND hasn't been completed yet
  const showOnboardingScreen = showOnboarding && !onboardingComplete;

  // TODO: Show error state if initialization failed
  // For now, we still show the app but log the error
  if (initError) {
    console.error('App initialized with errors:', initError);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <MenuProvider>
            <AppNavigator />
            <StatusBar style="auto" />
            {showOnboardingScreen && (
              <OnboardingModal
                visible={showOnboardingScreen}
                onComplete={handleOnboardingComplete}
              />
            )}
          </MenuProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
