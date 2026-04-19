import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Surface, Card } from 'react-native-paper';
import type { VocabularyItem } from '../../services/progressService';
import WordLookupModal from '../WordLookupModal';

interface VocabularyListProps {
  words: VocabularyItem[];
}

export default function VocabularyList({ words }: VocabularyListProps) {
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [lookupVisible, setLookupVisible] = useState(false);

  const handleWordPress = (word: string) => {
    setLookupWord(word);
    setLookupVisible(true);
  };

  const handleCloseLookup = () => {
    setLookupVisible(false);
    setLookupWord(null);
  };

  if (words.length === 0) {
    return (
      <Surface style={styles.emptyContainer} elevation={1}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No words found
        </Text>
      </Surface>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {words.map((item, index) => (
            <TouchableOpacity
              key={`${item.word}-${index}`}
              onPress={() => handleWordPress(item.word)}
              activeOpacity={0.7}
              style={styles.gridItem}
            >
              <Card style={styles.card} elevation={1}>
                <Card.Content style={styles.cardContent}>
                  <Text variant="titleLarge" style={styles.wordText}>
                    {item.word}
                  </Text>
                  <Text variant="bodySmall" style={styles.countText}>
                    {item.lookupCount}x
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <WordLookupModal
        visible={lookupVisible}
        wordText={lookupWord}
        onClose={handleCloseLookup}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '30%',
    flexGrow: 1,
    maxWidth: '33%',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordText: {
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    fontSize: 20,
  },
  countText: {
    color: '#888',
    marginTop: 2,
    fontSize: 11,
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
  },
});
