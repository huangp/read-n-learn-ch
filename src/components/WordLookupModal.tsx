import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Snackbar, Modal, Portal } from 'react-native-paper';
import { SegmentedWord, ExampleSentence } from '../types';
import type { WordLookupResult } from '../data/dictionary';
import { searchDictionarySync, getExamplesForWord } from '../services/dictionaryLoader';
import { useSubscription } from '../hooks/useSubscription';
import { PaywallModal } from './subscription/PaywallModal';
import { ApiClient } from '../api/client';
import type { LookupResponse } from '../api/generated';

interface WordLookupModalProps {
  visible: boolean;
  word?: SegmentedWord | null;
  /** Plain text alternative to `word` — use when you don't have a SegmentedWord */
  wordText?: string | null;
  onClose: () => void;
}

// Cache for API lookup results
const apiLookupCache = new Map<string, LookupResponse>();

export default function WordLookupModal({
  visible,
  word,
  wordText,
  onClose,
}: WordLookupModalProps) {
  const { height } = useWindowDimensions();
  const { isActive, hasCloudAccess } = useSubscription();

  // Resolve the actual text to look up
  const text = word?.text ?? wordText ?? null;

  // State for example sentences
  const [examples, setExamples] = useState<ExampleSentence[]>([]);

  // State for API lookup
  const [showPaywall, setShowPaywall] = useState(false);
  const [apiResult, setApiResult] = useState<LookupResponse | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [useApiResults, setUseApiResults] = useState(false);

  // Synchronous lookup - dictionary is preloaded at app startup
  const lookup: WordLookupResult | null = useMemo(() => {
    if (!text) return null;

    const entry = searchDictionarySync(text);

    // Build character breakdown with alternate readings
    const chars: Array<{
      char: string;
      pinyin: string;
      literalMeaning: string;
      contextualMeaning: string;
      alternateReadings?: Array<{ pinyin: string; meaning: string }>;
    }> = [];
    if (text.length > 1) {
      for (const c of text) {
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
        examples: [],
        characters: chars,
      };
    }

    return {
      word: text,
      pinyin: '',
      definitions: ['(Not found in dictionary)'],
      pos: '',
      examples: [],
      characters: chars,
    };
  }, [text]);

  // Fetch example sentences asynchronously when word changes
  useEffect(() => {
    if (!text) {
      setExamples([]);
      return;
    }

    getExamplesForWord(text, 3).then(setExamples);
  }, [text]);

  // Reset API state when modal closes or word changes
  useEffect(() => {
    console.log('[WordLookupModal] Reset effect - visible:', visible, 'text:', text);
    if (!visible) {
      console.log('[WordLookupModal] Resetting API state because visible is false');
      setApiResult(null);
      setUseApiResults(false);
      setApiError(null);
      setIsLoadingApi(false);
    }
  }, [visible, text]);

  // Check cache when word changes
  useEffect(() => {
    if (text && apiLookupCache.has(text)) {
      setApiResult(apiLookupCache.get(text)!);
      setUseApiResults(true);
    }
  }, [text]);

  const handleApiLookup = useCallback(async () => {
    if (!isActive) {
      setShowPaywall(true);
      console.log("---- inside first block");
      return;
    }

    // Check cache first
    if (text && apiLookupCache.has(text)) {
      setApiResult(apiLookupCache.get(text)!);
      setUseApiResults(true);
      return;
    }

    setIsLoadingApi(true);
    setApiError(null);

    try {
      const result = await ApiClient.lookupVocabulary(text || '');
      
      // Cache the result
      if (text) {
        apiLookupCache.set(text, result);
      }
      
      setApiResult(result);
      setUseApiResults(true);
    } catch (error) {
      console.error('Cloud lookup failed:', error);
      console.error('Error details:', (error as Error).message);
      setApiError('Cloud lookup failed. Showing local results.');
      // Keep showing local results
    } finally {
      setIsLoadingApi(false);
    }
  }, [isActive, text]);

  const toggleSource = useCallback(() => {
    setUseApiResults(!useApiResults);
  }, [useApiResults]);

  // console.log('[WordLookupModal] Render - text:', text, 'word:', word, 'wordText:', wordText, 'visible:', visible);

  if (!text) {
    return (
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onClose}
          contentContainerStyle={[styles.modalContainer, { height: height * 0.6 }]}
        >
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, color: '#666' }}>No word selected</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    );
  }

  // ---- Sub-renderers ----

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.wordText}>{lookup?.word ?? text}</Text>
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

  const renderApiToggle = () => {
    // Don't show toggle if no API result yet
    if (!apiResult && !isLoadingApi) {
      return (
        <TouchableOpacity
          style={styles.apiLookupButton}
          onPress={handleApiLookup}
          disabled={isLoadingApi}
        >
          {isLoadingApi ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.apiLookupButtonText}>
              {isActive ? 'Cloud Lookup' : 'Cloud Lookup (Pro)'}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    // Show toggle when API result is available
    return (
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, !useApiResults && styles.toggleButtonActive]}
          onPress={() => setUseApiResults(false)}
        >
          <Text style={[styles.toggleButtonText, !useApiResults && styles.toggleButtonTextActive]}>
            Local
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, useApiResults && styles.toggleButtonActive]}
          onPress={() => setUseApiResults(true)}
        >
          <Text style={[styles.toggleButtonText, useApiResults && styles.toggleButtonTextActive]}>
            Cloud
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDefinitions = () => {
    // Use API results if toggled and available
    if (useApiResults && apiResult) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Definitions (Cloud)</Text>
          {apiResult.definition ? (
            <Text style={styles.definition}>{apiResult.definition}</Text>
          ) : (
            <Text style={styles.emptyHint}>No definition available from cloud</Text>
          )}
        </View>
      );
    }

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
    // Use API examples if available and toggled
    if (useApiResults && apiResult?.examples && apiResult.examples.length > 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Example Sentences (Cloud)</Text>
          {apiResult.examples.map((ex, i) => (
            <View key={i} style={styles.exampleContainer}>
              <Text style={styles.exampleChinese}>{ex.chinese}</Text>
              {ex.pinyin ? (
                <Text style={styles.examplePinyin}>{ex.pinyin}</Text>
              ) : null}
              {ex.english ? (
                <Text style={styles.exampleEnglish}>{ex.english}</Text>
              ) : null}
            </View>
          ))}
        </View>
      );
    }

    // Fall back to local examples
    if (examples.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Example Sentences</Text>
        {examples.map((ex, i) => (
          <View key={i} style={styles.exampleContainer}>
            <Text style={styles.exampleChinese}>{ex.chinese}</Text>
            {ex.pinyin ? (
              <Text style={styles.examplePinyin}>{ex.pinyin}</Text>
            ) : null}
            {ex.english ? (
              <Text style={styles.exampleEnglish}>{ex.english}</Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderCharacterBreakdown = () => {
    // Don't show character breakdown for API results
    if (useApiResults) return null;

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

  const renderStrokeOrder = () => {
    if (!useApiResults || !apiResult?.strokeOrder) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stroke Order</Text>
        <Text style={styles.strokeOrderText}>{apiResult.strokeOrder}</Text>
      </View>
    );
  };

  // ---- Modal ----

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onClose}
          contentContainerStyle={[styles.modalContainer, { height: height * 0.6 }]}
        >
          <View style={styles.dragHandle} />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {renderHeader()}
            {renderApiToggle()}
            {renderDefinitions()}
            {renderStrokeOrder()}
            {renderCharacterBreakdown()}
            {renderExamples()}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName="Cloud Dictionary Lookup"
      />

      <Snackbar
        visible={!!apiError}
        onDismiss={() => setApiError(null)}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setApiError(null),
        }}
      >
        {apiError}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    margin: 20,
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
  examplePinyin: {
    fontSize: 14,
    lineHeight: 20,
    color: '#007AFF',
    marginTop: 2,
    fontStyle: 'italic',
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
  // New styles for API lookup
  apiLookupButton: {
    backgroundColor: '#5856D6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 16,
    minWidth: 140,
    alignItems: 'center',
  },
  apiLookupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    alignSelf: 'center',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  strokeOrderText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    fontFamily: 'monospace',
  },
});
