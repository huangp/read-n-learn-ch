import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  Appbar,
  Text,
  Surface,
  SegmentedButtons,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

type TabType = 'study' | 'stats' | 'achievements';

// Lazy-loaded section components
const StudySection = React.lazy(() => import('../components/progress/StudySection'));
const StatsSection = React.lazy(() => import('../components/progress/StatsSection'));
const AchievementsSection = React.lazy(() => import('../components/progress/AchievementsSection'));

// Loading placeholder for lazy-loaded sections
const SectionLoader = () => (
  <View style={styles.loaderContainer}>
    <ActivityIndicator animating={true} size="large" />
  </View>
);

export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('study');
  const [loadedTabs, setLoadedTabs] = useState<Set<TabType>>(new Set(['study']));
  const theme = useTheme();

  // Mark tab as loaded when selected
  const handleTabChange = (value: string) => {
    const tab = value as TabType;
    setActiveTab(tab);
    setLoadedTabs(prev => new Set(prev).add(tab));
  };

  // Preload adjacent tabs for smoother experience
  useFocusEffect(
    useCallback(() => {
      // Preload stats when on study tab
      if (activeTab === 'study') {
        setTimeout(() => {
          setLoadedTabs(prev => new Set(prev).add('stats'));
        }, 1000);
      }
    }, [activeTab])
  );

  const renderSection = () => {
    switch (activeTab) {
      case 'study':
        return (
          <React.Suspense fallback={<SectionLoader />}>
            <StudySection />
          </React.Suspense>
        );
      case 'stats':
        return loadedTabs.has('stats') ? (
          <React.Suspense fallback={<SectionLoader />}>
            <StatsSection />
          </React.Suspense>
        ) : null;
      case 'achievements':
        return loadedTabs.has('achievements') ? (
          <React.Suspense fallback={<SectionLoader />}>
            <AchievementsSection />
          </React.Suspense>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Progress & Study" />
      </Appbar.Header>

      <Surface style={styles.tabContainer} elevation={1}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={handleTabChange}
          buttons={[
            {
              value: 'study',
              label: 'Study',
              icon: 'book-open-variant',
            },
            {
              value: 'stats',
              label: 'Stats',
              icon: 'chart-line',
            },
            {
              value: 'achievements',
              label: 'Badges',
              icon: 'trophy',
            },
          ]}
          style={styles.segmentedButtons}
        />
      </Surface>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderSection()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  segmentedButtons: {
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
});
