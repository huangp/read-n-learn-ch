import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
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
        {words.map((item, index) => (
          <TouchableOpacity
            key={`${item.word}-${index}`}
            onPress={() => handleWordPress(item.word)}
            activeOpacity={0.7}
          >
            <Surface style={styles.wordCard} elevation={2}>
              <View style={styles.wordHeader}>
                <Text variant="headlineMedium" style={styles.wordText}>
                  {item.word}
                </Text>
                <Chip compact style={styles.lookupChip}>
                  Looked up {item.lookupCount} {item.lookupCount === 1 ? 'time' : 'times'}
                </Chip>
              </View>
            </Surface>
          </TouchableOpacity>
        ))}
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
    gap: 12,
    paddingBottom: 8,
  },
  wordCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordText: {
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  lookupChip: {
    backgroundColor: '#FFF3E0',
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
