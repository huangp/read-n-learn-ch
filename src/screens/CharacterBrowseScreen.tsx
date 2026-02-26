import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Text,
  Chip,
  Button,
  IconButton,
  Portal,
  Dialog,
  ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import CharacterRecognitionService, { Tag } from '../services/characterRecognition';
import WordLookupModal from '../components/WordLookupModal';

// ---------- Types ----------

interface HSKWord {
  word: string;
  isSpacer?: undefined;
}

interface SpacerItem {
  word: string;
  isSpacer: true;
}

type GridItem = HSKWord | SpacerItem;

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
    <Card
      mode={isKnown ? 'outlined' : 'elevated'}
      style={[styles.card, isKnown && styles.cardKnown]}
      onPress={() => onPress(word)}
      onLongPress={() => onLongPress(word)}
      delayLongPress={300}
    >
      <Card.Content style={styles.cardContent}>
        <Text 
          variant="titleLarge" 
          style={[styles.cardWord, isKnown && styles.cardWordKnown]}
        >
          {word}
        </Text>
      </Card.Content>
    </Card>
  );
});

const SpacerCard = React.memo(function SpacerCard() {
  return <View style={styles.spacerCard} />;
});

// ---------- Main screen ----------

export default function CharacterBrowseScreen() {
  const { width } = useWindowDimensions();
  const dataColumns = width >= 768 ? 7 : 3;
  const numColumns = dataColumns + 1;

  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [knownMap, setKnownMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [lookupVisible, setLookupVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagCharacters, setTagCharacters] = useState<string[]>([]);
  const [characterTags, setCharacterTags] = useState<Map<string, Tag[]>>(new Map());
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // Load HSK words from SQLite
  const [hskWords, setHskWords] = useState<Record<number, HSKWord[]>>({
    1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  });

  const loadHSKWords = useCallback(async () => {
    const words: Record<number, HSKWord[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const level of HSK_LEVELS) {
      const levelWords = await CharacterRecognitionService.getHSKWordsByLevel(level);
      words[level] = levelWords.map(w => ({ word: w }));
    }
    setHskWords(words);
  }, []);

  const currentWords = useMemo(() => {
    if (selectedTagId) {
      return tagCharacters.map(char => ({ word: char }));
    }
    return [];
  }, [selectedTagId, tagCharacters]);

  // Preload known status for all HSK words
  const allWordsRef = useRef<string[]>([]);
  if (allWordsRef.current.length === 0) {
    const all: string[] = [];
    for (const level of HSK_LEVELS) {
      for (const w of (hskWords[level] || [])) all.push(w.word);
    }
    allWordsRef.current = all;
  }

  const loadKnownStatus = useCallback(async () => {
    setLoading(true);
    const map = await CharacterRecognitionService.getKnownStatusBatch(allWordsRef.current);
    setKnownMap(map);
    setLoading(false);
  }, []);

  const loadTags = useCallback(async () => {
    const allTags = await CharacterRecognitionService.getAllTags();
    setTags(allTags);
  }, []);

  const loadVocabularyTags = useCallback(async (vocabularyIds: string[]) => {
    const tagMap = new Map<string, Tag[]>();
    for (const id of vocabularyIds) {
      const itemTags = await CharacterRecognitionService.getVocabularyTags(id);
      tagMap.set(id, itemTags);
    }
    setCharacterTags(tagMap);
  }, []);

  const loadTagVocabulary = useCallback(async (tagId: number) => {
    setLoading(true);
    
    try {
      // Find the tag name to check if it's an HSK tag
      const tag = tags.find(t => t.id === tagId);
      const hskMatch = tag?.name.match(/^HSK(\d)$/);
      
      let vocabularyIds: string[];
      if (hskMatch) {
        // Use hsk_level column for HSK tags (more reliable)
        const level = parseInt(hskMatch[1], 10);
        vocabularyIds = await CharacterRecognitionService.getVocabularyByHSKLevel(level);
        console.log(`[TagFilter] HSK${level}: loaded ${vocabularyIds.length} items`);
      } else {
        // Use vocabulary_tags table for other tags
        vocabularyIds = await CharacterRecognitionService.getVocabularyByTag(tagId);
        console.log(`[TagFilter] Tag ${tagId}: loaded ${vocabularyIds.length} items`);
      }
      
      setTagCharacters(vocabularyIds);
      
      // Load known status for vocabulary items
      if (vocabularyIds.length > 0) {
        const map = await CharacterRecognitionService.getKnownStatusBatch(vocabularyIds);
        setKnownMap(map);
        // Load tags for vocabulary
        await loadVocabularyTags(vocabularyIds);
      } else {
        setKnownMap(new Map());
        setCharacterTags(new Map());
      }
    } catch (error) {
      console.error('[TagFilter] Error loading tag vocabulary:', error);
      setTagCharacters([]);
      setKnownMap(new Map());
      setCharacterTags(new Map());
    } finally {
      setLoading(false);
    }
  }, [loadVocabularyTags, tags]);

  useFocusEffect(
    useCallback(() => {
      loadHSKWords();
      loadKnownStatus();
      loadTags();
    }, [loadHSKWords, loadKnownStatus, loadTags])
  );

  useEffect(() => {
    if (selectedTagId) {
      loadTagVocabulary(selectedTagId);
    }
  }, [selectedTagId, loadTagVocabulary]);

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
  const handleToggleKnown = useCallback(async (word: string) => {
    const nowKnown = await CharacterRecognitionService.toggleWordKnown(word);
    setKnownMap((prev) => {
      const next = new Map(prev);
      next.set(word, nowKnown);
      return next;
    });
  }, []);

  const handleShowDefinition = useCallback((word: string) => {
    setLookupWord(word);
    setLookupVisible(true);
  }, []);


  const renderTagTab = useCallback((tag: Tag) => {
    const isSelected = selectedTagId === tag.id;
    return (
      <Chip
        key={tag.id}
        selected={isSelected}
        onPress={() => {
          if (isSelected) {
            setSelectedTagId(null);
          } else {
            setSelectedTagId(tag.id);
          }
        }}
        style={[styles.tagChip, isSelected && { backgroundColor: '#FF9500' }]}
        // selectedColor="#FF9500"
        showSelectedCheck={false}
      >
        {tag.name}
      </Chip>
    );
  }, [selectedTagId, setSelectedTagId]);

  const renderFilterTab = useCallback((mode: FilterMode, label: string) => {
    const isSelected = filterMode === mode;
    return (
      <Chip
        key={mode}
        selected={isSelected}
        onPress={() => setFilterMode(mode)}
        mode={isSelected ? 'flat' : 'outlined'}
        style={styles.filterChip}
        showSelectedCheck={false}
      >
        {label}
      </Chip>
    );
  }, [filterMode, setFilterMode]);

  const renderWordCard = useCallback(({ item }: { item: GridItem }) => {
    if (item.isSpacer) {
      return <SpacerCard />;
    }
    const isKnown = knownMap.get(item.word) === true;
    return (
      <WordCard
        word={item.word}
        isKnown={isKnown}
        onPress={handleShowDefinition}
        onLongPress={handleToggleKnown}
      />
    );
  }, [knownMap, handleShowDefinition, handleToggleKnown]);

  const keyExtractor = useCallback((item: GridItem) => item.word, []);

  return (
    <View style={styles.container}>
      {/* Tag Filter - Only show tags, no HSK tabs */}
      <View style={styles.tagRowWrap}>
        {tags.map(renderTagTab)}
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
        <Button
          mode="contained"
          onPress={() => navigation.navigate('TagManagement')}
          compact
          style={styles.tagsButton}
        >
          Tags
        </Button>
        <IconButton
          icon="help-circle"
          size={24}
          onPress={() => setHelpVisible(true)}
        />
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

      {/* Help Dialog */}
      <Portal>
        <Dialog visible={helpVisible} onDismiss={() => setHelpVisible(false)}>
          <Dialog.Title>How to Use</Dialog.Title>
          <Dialog.Content>
            <View style={styles.helpRow}>
              <Text style={styles.helpIcon}>👆</Text>
              <View style={styles.helpTextBlock}>
                <Text variant="bodyMedium" style={styles.helpAction}>Tap</Text>
                <Text variant="bodySmall" style={styles.helpDesc}>View pinyin, definition, and character breakdown</Text>
              </View>
            </View>

            <View style={styles.helpRow}>
              <Text style={styles.helpIcon}>👆⏱️</Text>
              <View style={styles.helpTextBlock}>
                <Text variant="bodyMedium" style={styles.helpAction}>Long Press</Text>
                <Text variant="bodySmall" style={styles.helpDesc}>Toggle a word between known and unknown</Text>
              </View>
            </View>

            <View style={styles.helpRow}>
              <View style={[styles.helpSampleCard, styles.helpSampleKnown]}>
                <Text style={styles.helpSampleText}>字</Text>
              </View>
              <View style={styles.helpTextBlock}>
                <Text variant="bodyMedium" style={styles.helpAction}>Green border</Text>
                <Text variant="bodySmall" style={styles.helpDesc}>Word is marked as known</Text>
              </View>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setHelpVisible(false)}>Got it</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Tag Management Dialog */}
      <Portal>
        <Dialog visible={tagModalVisible} onDismiss={() => setTagModalVisible(false)}>
          <Dialog.Title>
            {selectedCharacter ? `Tags for "${selectedCharacter}"` : 'Character Tags'}
          </Dialog.Title>
          <Dialog.Content>
            <View style={styles.tagModalButtons}>
              <Button
                mode="outlined"
                icon="book-open"
                onPress={() => {
                  if (selectedCharacter) {
                    setLookupWord(selectedCharacter);
                    setLookupVisible(true);
                  }
                  setTagModalVisible(false);
                }}
                style={styles.tagModalButton}
              >
                View Details
              </Button>
              <Button
                mode="outlined"
                icon="tag"
                onPress={() => {
                  setTagModalVisible(false);
                  navigation.navigate('TagManagement');
                }}
                style={styles.tagModalButton}
              >
                Manage Tags
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTagModalVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 2,
    borderColor: 'transparent',
    height: 72,
  },
  spacerCard: {
    flex: 1,
    height: 72,
  },
  cardKnown: {
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
  tagRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    gap: 8,
  },
  tagTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  tagTabSelected: {
    backgroundColor: '#FF9500',
  },
  tagTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  tagTabTextSelected: {
    color: '#fff',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
    gap: 2,
  },
  tagBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    minWidth: 16,
    alignItems: 'center',
  },
  tagBadgeText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '600',
  },
  moreTagsText: {
    fontSize: 8,
    color: '#999',
    marginLeft: 2,
  },
  tagBadgePlaceholder: {
    height: 14,
    minWidth: 16,
  },
  tagsButton: {
    marginRight: 8,
  },
  tagChip: {
    marginRight: 4,
  },
  filterChip: {
    marginRight: 4,
  },
  cardContent: {
    padding: 8,
    alignItems: 'center',
  },
  tagChipText: {
    fontSize: 8,
    color: '#fff',
  },
  tagChipPlaceholder: {
    height: 14,
    minWidth: 16,
  },
  manageTagsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  manageTagsButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tagModalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  tagModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  tagModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  tagModalButton: {
    alignItems: 'center',
    padding: 12,
  },
  tagModalButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  tagModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
