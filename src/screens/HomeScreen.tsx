import React, { useState, useCallback } from 'react';
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
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Article, RootStackParamList } from '../types';
import { StorageService } from '../services/storage';
import CharacterRecognitionService, { ArticleMeta } from '../services/characterRecognition';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [articles, setArticles] = useState<Article[]>([]);
  const [metaMap, setMetaMap] = useState<Map<string, ArticleMeta>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadArticles = async () => {
    try {
      const data = await StorageService.getAllArticles();
      setArticles(data);
      const meta = await CharacterRecognitionService.getAllArticleMeta();
      setMetaMap(meta);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      const results = await StorageService.searchArticles(searchQuery);
      setArticles(results);
    } else {
      loadArticles();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [])
  );

  const theme = useTheme();

  const renderArticle = ({ item }: { item: Article }) => {
    const meta = metaMap.get(item.id);

    // Determine dominant HSK level
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
      const dominant = levels.reduce((a, b) => (b.count > a.count ? b : a), levels[0]);
      if (dominant.count > 0) {
        hskLabel = `HSK${dominant.level}`;
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
            <Text variant="titleMedium" numberOfLines={2}>
              {item.title || 'Untitled'}
            </Text>
             <Text variant="bodyMedium" numberOfLines={2} style={styles.articlePreview}>
               {item.content}
             </Text>
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
                    <Text variant="bodySmall" style={[styles.metaText, styles.newText]}>{meta.unknownChars} new</Text>
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
        <Appbar.Action icon="translate" onPress={() => navigation.navigate('CharacterBrowser')} />
        {/*<Appbar.Action icon="tag-multiple" onPress={() => navigation.navigate('TagManagement')} />*/}
        <Appbar.Action icon="cog" onPress={() => navigation.navigate('Settings')} />
      </Appbar.Header>

      <Searchbar
        placeholder="Search articles..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        onSubmitEditing={handleSearch}
        style={styles.searchbar}
      />

      <FlatList
        data={articles}
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
});
