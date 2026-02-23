import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SegmentedWord } from '../types';
import type { WordLookupResult } from '../data/dictionary';
import { searchDictionarySync } from '../services/dictionaryLoader';

interface WordLookupModalProps {
  visible: boolean;
  word: SegmentedWord | null;
  onClose: () => void;
}

export default function WordLookupModal({
  visible,
  word,
  onClose,
}: WordLookupModalProps) {
  const { height } = useWindowDimensions();

  // Synchronous lookup - dictionary is preloaded at app startup
  const lookup: WordLookupResult | null = useMemo(() => {
    if (!word?.text) return null;

    const entry = searchDictionarySync(word.text);

    // Build character breakdown with alternate readings
    const chars: Array<{
      char: string;
      pinyin: string;
      literalMeaning: string;
      contextualMeaning: string;
      alternateReadings?: Array<{ pinyin: string; meaning: string }>;
    }> = [];
    if (word.text.length > 1) {
      for (const c of word.text) {
        if (/[\u4e00-\u9fa5]/.test(c)) {
          const ce = searchDictionarySync(c);
          const alts: Array<{ pinyin: string; meaning: string }> = [];
          let mainMeaning = '';

          if (ce) {
            // Extract alternate readings from "also ..." definitions
            for (const d of ce.definitions) {
              const altMatch = d.match(/^also\s+(\S+?):\s+(.+)$/);
              if (altMatch) {
                alts.push({ pinyin: altMatch[1], meaning: altMatch[2] });
              } else if (!mainMeaning) {
                mainMeaning = d;
              }
            }
          }

          chars.push({
            char: c,
            pinyin: ce?.pinyin || '',
            literalMeaning: mainMeaning,
            contextualMeaning: '',
            alternateReadings: alts.length > 0 ? alts : undefined,
          });
        }
      }
    }

    if (entry) {
      return {
        word: entry.simplified,
        pinyin: entry.pinyin,
        definitions: entry.definitions,
        pos: entry.pos || '',
        hskLevel: entry.hskLevel,
        examples: (entry.examples || []).slice(0, 3),
        characters: chars,
      };
    }

    return {
      word: word.text,
      pinyin: '',
      definitions: ['(Not found in dictionary)'],
      pos: '',
      examples: [],
      characters: chars,
    };
  }, [word?.text]);

  if (!word) return null;

  // ---- Sub-renderers ----

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.wordText}>{lookup?.word ?? word.text}</Text>
      {lookup?.pinyin ? (
        <Text style={styles.pinyin}>{lookup.pinyin}</Text>
      ) : null}
      {lookup?.hskLevel ? (
        <View style={styles.hskBadge}>
          <Text style={styles.hskText}>HSK {lookup.hskLevel}</Text>
        </View>
      ) : null}
      {lookup?.pos ? (
        <Text style={styles.pos}>{lookup.pos}</Text>
      ) : null}
    </View>
  );

  const renderDefinitions = () => {
    // Filter out "also ..." alternate reading entries — those are shown in character breakdown
    const defs = (lookup?.definitions || []).filter(d => !d.match(/^also\s+\S+?:\s+/));

    if (defs.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Definitions</Text>
          <Text style={styles.emptyHint}>No definitions available</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Definitions</Text>
        {defs.map((def, i) => (
          <Text key={i} style={styles.definition}>
            {i + 1}. {def}
          </Text>
        ))}
      </View>
    );
  };

  const renderExamples = () => {
    const examples = lookup?.examples?.slice(0, 3) ?? [];

    if (examples.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Example Sentences</Text>
        {examples.map((ex, i) => (
          <View key={i} style={styles.exampleContainer}>
            <Text style={styles.exampleChinese}>{ex.chinese}</Text>
            {ex.english ? (
              <Text style={styles.exampleEnglish}>{ex.english}</Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderCharacterBreakdown = () => {
    if (!lookup?.characters || lookup.characters.length <= 1) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Character Breakdown</Text>
        {lookup.characters.map((c: any, i: number) => (
          <View key={i} style={styles.characterRow}>
            <View style={styles.characterBox}>
              <Text style={styles.characterText}>{c.char}</Text>
            </View>
            <View style={styles.characterInfo}>
              <Text style={styles.characterPinyin}>{c.pinyin}</Text>
              {c.literalMeaning ? (
                <Text style={styles.characterMeaning}>{c.literalMeaning}</Text>
              ) : c.contextualMeaning ? (
                <Text style={styles.characterMeaning}>{c.contextualMeaning}</Text>
              ) : null}
              {c.alternateReadings?.map((alt: { pinyin: string; meaning: string }, j: number) => (
                <Text key={j} style={styles.altReading}>
                  also <Text style={styles.altPinyin}>{alt.pinyin}</Text>: {alt.meaning}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ---- Modal ----

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={onClose}
          activeOpacity={1}
        >
          <View style={styles.spacer} />
        </TouchableOpacity>

        <View style={[styles.modalContainer, { height: height * 0.6 }]}>
          <View style={styles.dragHandle} />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderHeader()}
            {renderDefinitions()}
            {renderExamples()}
            {renderCharacterBreakdown()}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  wordText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
  },
  pinyin: {
    fontSize: 20,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
  pos: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
  },
  hskBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  hskText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  definition: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 14,
    color: '#bbb',
    fontStyle: 'italic',
  },
  exampleContainer: {
    marginBottom: 14,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF22',
  },
  exampleChinese: {
    fontSize: 16,
    lineHeight: 26,
    color: '#333',
  },
  exampleEnglish: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginTop: 2,
  },
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  characterBox: {
    width: 42,
    height: 42,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  characterText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  characterInfo: {
    flex: 1,
  },
  characterPinyin: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  characterMeaning: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  altReading: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  altPinyin: {
    color: '#007AFF',
    fontWeight: '500',
    fontStyle: 'normal',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});