import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CharacterRecognitionService from '../services/characterRecognition';
import WordLookupModal from '../components/WordLookupModal';

// ---------- Pre-compute HSK data once at module load time ----------

interface HSKWord {
  word: string;
  isSpacer?: undefined;
}

interface SpacerItem {
  word: string;
  isSpacer: true;
}

type GridItem = HSKWord | SpacerItem;

let _hskCache: Record<number, HSKWord[]> | null = null;

function getAllHSKWords(): Record<number, HSKWord[]> {
  if (_hskCache) return _hskCache;
  _hskCache = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  try {
    const data: Array<{ s: string; h?: number }> =
      require('../../assets/dict/cedict-core.json');
    for (const e of data) {
      if (e.h && e.h >= 1 && e.h <= 6) {
        _hskCache[e.h].push({ word: e.s });
      }
    }
  } catch {}
  return _hskCache;
}

const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const;

type FilterMode = 'all' | 'known' | 'unknown';

// ---------- Memoized card component ----------

const WordCard = React.memo(function WordCard({
  word,
  isKnown,
  onPress,
  onLongPress,
}: {
  word: string;
  isKnown: boolean;
  onPress: (w: string) => void;
  onLongPress: (w: string) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, isKnown && styles.cardKnown]}
      onPress={() => onPress(word)}
      onLongPress={() => onLongPress(word)}
      delayLongPress={300}
      activeOpacity={0.7}
    >
      <Text style={[styles.cardWord, isKnown && styles.cardWordKnown]}>{word}</Text>
    </TouchableOpacity>
  );
});

const SpacerCard = React.memo(function SpacerCard() {
  return <View style={styles.spacerCard} />;
});

// ---------- Main screen ----------

export default function HSKBrowserScreen() {
  const { width } = useWindowDimensions();
  const dataColumns = width >= 768 ? 7 : 3;
  const numColumns = dataColumns + 1;

  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [knownMap, setKnownMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [lookupVisible, setLookupVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  // Pre-loaded at module level — no per-render cost
  const hskData = useMemo(() => getAllHSKWords(), []);

  const currentWords = hskData[selectedLevel] || [];

  // Preload known status for ALL levels once, then just re-read on focus
  const allWordsRef = useRef<string[]>([]);
  if (allWordsRef.current.length === 0) {
    const all: string[] = [];
    for (const level of HSK_LEVELS) {
      for (const w of (hskData[level] || [])) all.push(w.word);
    }
    allWordsRef.current = all;
  }

  const loadKnownStatus = useCallback(async () => {
    setLoading(true);
    const map = await CharacterRecognitionService.getKnownStatusBatch(allWordsRef.current);
    setKnownMap(map);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadKnownStatus();
    }, [loadKnownStatus])
  );

  // Filtered list
  const filteredWords = useMemo(() => {
    if (filterMode === 'all') return currentWords;
    return currentWords.filter((w) => {
      const isKnown = knownMap.get(w.word) === true;
      return filterMode === 'known' ? isKnown : !isKnown;
    });
  }, [currentWords, filterMode, knownMap]);

  // Stats for current level
  const stats = useMemo(() => {
    const total = currentWords.length;
    let known = 0;
    for (const w of currentWords) {
      if (knownMap.get(w.word)) known++;
    }
    return { total, known, unknown: total - known, pct: total > 0 ? Math.round((known / total) * 100) : 0 };
  }, [currentWords, knownMap]);

  // Pad data with spacers
  const paddedWords = useMemo(() => {
    const result: GridItem[] = [];
    let col = 0;
    for (const w of filteredWords) {
      result.push(w);
      col++;
      if (col === dataColumns) {
        result.push({ word: `__spacer_${result.length}`, isSpacer: true });
        col = 0;
      }
    }
    if (col > 0) {
      while (col < dataColumns) {
        result.push({ word: `__empty_${result.length}`, isSpacer: true });
        col++;
      }
      result.push({ word: `__spacer_${result.length}`, isSpacer: true });
    }
    return result;
  }, [filteredWords, dataColumns]);

  // Stable callbacks — don't recreate on every render
  const handleToggle = useCallback(async (word: string) => {
    const nowKnown = await CharacterRecognitionService.toggleWordKnown(word);
    setKnownMap((prev) => {
      const next = new Map(prev);
      next.set(word, nowKnown);
      return next;
    });
  }, []);

  const handleLongPress = useCallback((word: string) => {
    setLookupWord(word);
    setLookupVisible(true);
  }, []);

  const renderLevelTab = (level: number) => {
    const isSelected = level === selectedLevel;
    return (
      <TouchableOpacity
        key={level}
        style={[styles.levelTab, isSelected && styles.levelTabSelected]}
        onPress={() => setSelectedLevel(level)}
      >
        <Text style={[styles.levelTabText, isSelected && styles.levelTabTextSelected]}>
          HSK {level}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFilterTab = (mode: FilterMode, label: string) => {
    const isSelected = filterMode === mode;
    return (
      <TouchableOpacity
        key={mode}
        style={[styles.filterTab, isSelected && styles.filterTabSelected]}
        onPress={() => setFilterMode(mode)}
      >
        <Text style={[styles.filterTabText, isSelected && styles.filterTabTextSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderWordCard = useCallback(({ item }: { item: GridItem }) => {
    if (item.isSpacer) {
      return <SpacerCard />;
    }
    const isKnown = knownMap.get(item.word) === true;
    return (
      <WordCard
        word={item.word}
        isKnown={isKnown}
        onPress={handleToggle}
        onLongPress={handleLongPress}
      />
    );
  }, [knownMap, handleToggle, handleLongPress]);

  const keyExtractor = useCallback((item: GridItem) => item.word, []);

  return (
    <View style={styles.container}>
      {/* HSK Level Tabs */}
      <View style={styles.levelRow}>
        {HSK_LEVELS.map(renderLevelTab)}
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { flex: stats.known || 0 }]} />
          <View style={{ flex: stats.unknown || 1 }} />
        </View>
        <Text style={styles.statsText}>
          {stats.known} / {stats.total} known ({stats.pct}%)
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <View style={styles.filterTabs}>
          {renderFilterTab('all', `All (${stats.total})`)}
          {renderFilterTab('known', `Known (${stats.known})`)}
          {renderFilterTab('unknown', `Unknown (${stats.unknown})`)}
        </View>
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => setHelpVisible(true)}
        >
          <Text style={styles.helpButtonText}>?</Text>
        </TouchableOpacity>
      </View>

      {/* Word Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          key={`grid-${numColumns}`}
          data={paddedWords}
          renderItem={renderWordCard}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={true}
          initialNumToRender={40}
          maxToRenderPerBatch={60}
          windowSize={5}
          removeClippedSubviews={true}
          getItemLayout={(_data, index) => ({
            length: 60, // card minHeight 52 + gap 8
            offset: 60 * Math.floor(index / numColumns),
            index,
          })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {filterMode === 'known'
                  ? 'No known words yet for this level'
                  : filterMode === 'unknown'
                  ? 'All words are known! 🎉'
                  : 'No words found'}
              </Text>
            </View>
          }
        />
      )}

      {/* Word Lookup Modal — long press to view */}
      <WordLookupModal
        visible={lookupVisible}
        wordText={lookupWord}
        onClose={() => {
          setLookupVisible(false);
          setLookupWord(null);
        }}
      />

      {/* Help Modal */}
      <Modal
        visible={helpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpVisible(false)}
      >
        <TouchableOpacity
          style={styles.helpOverlay}
          activeOpacity={1}
          onPress={() => setHelpVisible(false)}
        >
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>How to Use</Text>

            <View style={styles.helpRow}>
              <Text style={styles.helpIcon}>👆</Text>
              <View style={styles.helpTextBlock}>
                <Text style={styles.helpAction}>Tap</Text>
                <Text style={styles.helpDesc}>Toggle a word between known and unknown</Text>
              </View>
            </View>

            <View style={styles.helpRow}>
              <Text style={styles.helpIcon}>👆💬</Text>
              <View style={styles.helpTextBlock}>
                <Text style={styles.helpAction}>Long Press</Text>
                <Text style={styles.helpDesc}>View pinyin, definition, and character breakdown</Text>
              </View>
            </View>

            <View style={styles.helpRow}>
              <View style={[styles.helpSampleCard, styles.helpSampleKnown]}>
                <Text style={styles.helpSampleText}>字</Text>
              </View>
              <View style={styles.helpTextBlock}>
                <Text style={styles.helpAction}>Green border</Text>
                <Text style={styles.helpDesc}>Word is marked as known</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.helpCloseButton}
              onPress={() => setHelpVisible(false)}
            >
              <Text style={styles.helpCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  levelRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  levelTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  levelTabSelected: {
    backgroundColor: '#007AFF',
  },
  levelTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  levelTabTextSelected: {
    color: '#fff',
  },
  statsBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8E8E8',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    backgroundColor: '#34C759',
  },
  statsText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  filterTabSelected: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextSelected: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 52,
  },
  spacerCard: {
    flex: 1,
    minHeight: 52,
  },
  cardKnown: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  cardWord: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  cardWordKnown: {
    color: '#2D8A4E',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  helpButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#888',
  },
  helpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  helpCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
  },
  helpIcon: {
    fontSize: 24,
    width: 44,
    textAlign: 'center',
  },
  helpTextBlock: {
    flex: 1,
  },
  helpAction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  helpDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  helpSampleCard: {
    width: 44,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  helpSampleKnown: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  helpSampleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D8A4E',
  },
  helpCloseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  helpCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
