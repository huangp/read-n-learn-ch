import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { progressService, VocabularyItem } from '../../services/progressService';
import VocabularyList from './VocabularyList';

export default function StudySection() {
  const [reviewWords, setReviewWords] = useState<VocabularyItem[]>([]);
  const [problemWords, setProblemWords] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      const [review, problem] = await Promise.all([
        progressService.getWordsForReview(20),
        progressService.getProblemWords(20),
      ]);
      setReviewWords(review);
      setProblemWords(problem);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Smart Review Queue Section */}
      <Surface style={styles.section} elevation={1}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Smart Review Queue
        </Text>
        <Text variant="bodyMedium" style={styles.sectionDescription}>
          Words you've looked up that need review
        </Text>
        <VocabularyList words={reviewWords} />
      </Surface>

      {/* Problem Words Section */}
      <Surface style={styles.section} elevation={1}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Problem Words
        </Text>
        <Text variant="bodyMedium" style={styles.sectionDescription}>
          Words you look up most frequently
        </Text>
        <VocabularyList words={problemWords} />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionDescription: {
    marginBottom: 16,
    color: '#666',
  },
});
