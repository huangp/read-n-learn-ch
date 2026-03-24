import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  FAB,
  Searchbar,
  Surface,
  ActivityIndicator,
  IconButton,
  Icon,
  useTheme,
  Snackbar,
  Chip,
  Button,
  Menu,
} from 'react-native-paper';
import { ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Article, RootStackParamList } from '../types';
import { StorageService } from '../services/storage';
import CharacterRecognitionService, { ArticleMeta } from '../services/characterRecognition';
import { ArticleTagsService } from '../services/articleTags';
import { SyncButton, SyncButtonRef } from '../components/SyncButton';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Source of truth - loaded once from database
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  // Filtered view of articles for display
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [metaMap, setMetaMap] = useState<Map<string, ArticleMeta>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [tagMenuVisible, setTagMenuVisible] = useState(false);
  const isSmallScreen = width < 600;
  const syncButtonRef = useRef<SyncButtonRef>(null);
  // Show tag dropdown on small screen if there are many tags
  const showTagDropdown = isSmallScreen && allTags.length > 2;

  // Load articles from database - single source of truth
  const loadArticles = async () => {
    try {
      const data = await StorageService.getAllArticles();
      setAllArticles(data);
      
      const meta = await CharacterRecognitionService.getAllArticleMeta();
      setMetaMap(meta);
      
      // Load all tags
      const tags = await ArticleTagsService.getAllTags();
      setAllTags(tags.sort()); // Sort alphabetically
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters in-memory (no database calls)
  const applyFilters = useCallback(() => {
    let results = [...allArticles];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      results = results.filter(article => 
        article.title?.toLowerCase().includes(lowerQuery)
      );
    }
    
    // Apply tag filter with OR logic
    if (selectedTags.length > 0) {
      results = results.filter(article => 
        selectedTags.some(tag => article.tags?.some(t => t.toLowerCase() === tag.toLowerCase()))
      );
    }
    
    // Apply unread filter
    if (showUnreadOnly) {
      results = results.filter(article => {
        const meta = metaMap.get(article.id);
        return !meta || meta.readCount === 0;
      });
    }
    
    setFilteredArticles(results);
  }, [allArticles, searchQuery, selectedTags, showUnreadOnly, metaMap]);

  // Re-filter when filter criteria or data changes
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
    setShowUnreadOnly(false);
    // applyFilters will run automatically via useEffect
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag];
      return newTags;
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  const handleSyncComplete = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
    // Refresh articles list after sync
    loadArticles();
  };

  const handleShowMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const onDismissSnackbar = () => setSnackbarVisible(false);

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [])
  );

  const theme = useTheme();

  const renderArticle = ({ item }: { item: Article }) => {
    const meta = metaMap.get(item.id);

    // Build HSK level counts display
    let hskLabel = '';
    if (meta) {
      const levels = [
        { level: 1, count: meta.hsk1Count },
        { level: 2, count: meta.hsk2Count },
        { level: 3, count: meta.hsk3Count },
        { level: 4, count: meta.hsk4Count },
        { level: 5, count: meta.hsk5Count },
        { level: 6, count: meta.hsk6Count },
      ];
      const nonZeroLevels = levels.filter(l => l.count > 0);
      if (nonZeroLevels.length > 0) {
        hskLabel = nonZeroLevels.map(l => `HSK${l.level}: ${l.count}`).join(', ');
      }
    }

    return (
      <Card
        style={[styles.articleCard]}
        onPress={() => navigation.navigate('ArticleDetail', { articleId: item.id })}
        mode="elevated"
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.contentWrapper}>
            <View style={styles.titleRow}>
              <Text variant="titleMedium" numberOfLines={2} style={styles.titleText}>
                {item.title || 'Untitled'}
              </Text>
              {meta && meta.readCount > 0 && (
                <View style={styles.readCountBadge}>
                  <Icon source="eye-check" size={14} color="#fff" />
                  <Text style={styles.readCountText}>{meta.readCount}</Text>
                </View>
              )}
            </View>
             <Text variant="bodyMedium" numberOfLines={2} style={styles.articlePreview}>
               {item.content}
             </Text>
             {item.tags && item.tags.length > 0 && (
               <View style={styles.tagsContainer}>
                 {item.tags.map((tag, index) => (
                   <View key={index} style={styles.tagChip}>
                     <Text style={styles.tagText}>{tag}</Text>
                   </View>
                 ))}
               </View>
             )}
          </View>
          <View style={styles.metaContainer}>
            <Icon source="format-size" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.metaText}>{item.wordCount} chars</Text>
            
            {meta && (
              <>
                <Text variant="bodySmall" style={styles.separator}>•</Text>
                <Text variant="bodySmall" style={styles.metaText}>{meta.uniqueChars} unique</Text>
                
                {meta.unknownChars > 0 && (
                  <>
                    <Text variant="bodySmall" style={styles.separator}>•</Text>
                    <Text variant="bodySmall" style={[styles.metaText, styles.newText]}>{meta.unknownChars} unfamiliar</Text>
                  </>
                )}
              </>
            )}
            
            {hskLabel && (
              <>
                <Text variant="bodySmall" style={styles.separator}>•</Text>
                <Text variant="labelSmall" style={styles.hskText}>{hskLabel}</Text>
              </>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const getNumColumns = (width: number) => {
    if (width >= 900) return 4; // Large tablets
    if (width >= 600) return 2; // Medium tablets
    return 1; // Phones
  };

  const numColumns = getNumColumns(width);

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Read and Learn Chinese" />
        <SyncButton ref={syncButtonRef} onSyncComplete={handleSyncComplete} onShowMessage={handleShowMessage} hidden={isSmallScreen} />
        {isSmallScreen ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<Appbar.Action icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
          >
            <Menu.Item leadingIcon="cloud-download" title="Cloud Sync (Premium)" onPress={() => { setMenuVisible(false); syncButtonRef.current?.triggerSync(); }} />
            <Menu.Item leadingIcon="chart-line" title="Progress" onPress={() => { setMenuVisible(false); navigation.navigate('Progress'); }} />
            <Menu.Item leadingIcon="translate" title="Vocabulary" onPress={() => { setMenuVisible(false); navigation.navigate('CharacterBrowser'); }} />
            <Menu.Item leadingIcon="crown" title="Premium Subscription" onPress={() => { setMenuVisible(false); navigation.navigate('Subscription'); }} />
            <Menu.Item leadingIcon="cog" title="Settings" onPress={() => { setMenuVisible(false); navigation.navigate('Settings'); }} />
          </Menu>
        ) : (
          <>
            <Appbar.Action icon="chart-line" onPress={() => navigation.navigate('Progress')} />
            <Appbar.Action icon="translate" onPress={() => navigation.navigate('CharacterBrowser')} />
            <Appbar.Action icon="crown" onPress={() => navigation.navigate('Subscription')} />
            <Appbar.Action icon="cog" onPress={() => navigation.navigate('Settings')} />
          </>
        )}
      </Appbar.Header>

      <Searchbar
        placeholder="Search articles..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Tag Filter - always rendered to prevent layout shift */}
      <View style={styles.filterContainer}>
        {allTags.length > 0 ? (
          <>
            {showTagDropdown ? (
              <>
                <Button
                  mode="outlined"
                  onPress={() => setTagMenuVisible(true)}
                  style={styles.tagDropdownButton}
                  icon="tag-multiple"
                  compact
                >
                  Tags {selectedTags.length > 0 ? `(${selectedTags.length})` : ''}
                </Button>
                <Menu
                  visible={tagMenuVisible}
                  onDismiss={() => setTagMenuVisible(false)}
                  anchor={<View style={styles.menuAnchor} />}
                  contentStyle={styles.tagMenuContent}
                >
                  {allTags.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <Menu.Item
                        key={tag}
                        title={tag}
                        leadingIcon={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        onPress={() => {
                          toggleTag(tag);
                        }}
                      />
                    );
                  })}
                </Menu>
              </>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagFilterContent}
              >
                {allTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Chip
                      key={tag}
                      selected={isSelected}
                      onPress={() => toggleTag(tag)}
                      style={isSelected ? styles.filterChipSelected : styles.filterChip}
                      showSelectedCheck={false}
                      icon={isSelected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                      compact
                    >
                      {tag}
                    </Chip>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.filterActions}>
              <Button
                mode="text"
                onPress={() => setShowUnreadOnly(!showUnreadOnly)}
                style={styles.unreadButton}
                icon="book-open-variant"
                compact
              >
                {showUnreadOnly ? 'All' : 'Unread only'}
              </Button>
              <Button
                mode="text"
                onPress={clearAllFilters}
                style={styles.clearButton}
                disabled={selectedTags.length === 0 && !searchQuery.trim() && !showUnreadOnly}
                compact
              >
                Clear All
              </Button>
            </View>
          </>
        ) : (
          <View style={styles.filterPlaceholder} />
        )}
      </View>

      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Surface style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator animating={true} size="large" />
            ) : (
              <>
                <IconButton icon="book-open-variant" size={64} iconColor="#ccc" />
                <Text variant="titleMedium" style={styles.emptyText}>
                  No articles yet
                </Text>
                <Text variant="bodyMedium" style={styles.emptySubtext}>
                  Tap + to create one!
                </Text>
              </>
            )}
          </Surface>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('ArticleEditor', {})}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={onDismissSnackbar}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 8,
  },
  listContainer: {
    padding: 4,
  },
  articleCard: {
    flex: 1,
    margin: 4,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  contentWrapper: {
    flex: 1,
  },
  articlePreview: {
    marginTop: 2,
    marginBottom: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  tagChip: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '500',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 'auto',
  },
  metaText: {
    marginLeft: 2,
  },
  separator: {
    marginHorizontal: 4,
    color: '#999',
  },
  newText: {
    color: '#FF9500',
    fontWeight: '500',
  },
  hskText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    margin: 16,
    padding: 32,
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 52,
  },
  tagFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
    minHeight: 44,
  },
  filterChip: {
    marginVertical: 4,
    marginHorizontal: 2,
  },
  filterChipSelected: {
    marginVertical: 4,
    marginHorizontal: 2,
  },
  clearButton: {
    marginLeft: 8,
  },
  filterActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPlaceholder: {
    flex: 1,
    minHeight: 44,
  },
  tagDropdownButton: {
    marginRight: 8,
  },
  menuAnchor: {
    width: 1,
    height: 1,
  },
  tagMenuContent: {
    maxHeight: 300,
  },
  unreadButton: {
    marginLeft: 8,
    width: 120,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  titleText: {
    flex: 1,
    marginRight: 8,
  },
  readCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  readCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
