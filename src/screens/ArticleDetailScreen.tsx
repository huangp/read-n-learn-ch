import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  useWindowDimensions,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  Text,
  Surface,
  Card,
  Appbar,
  Menu,
  IconButton,
  FAB,
  Portal,
  Modal,
  ActivityIndicator,
  Divider,
  TouchableRipple,
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Article, RootStackParamList, ReadingProgress, SegmentedWord } from '../types';
import { StorageService } from '../services/storage';
import DebugService from '../services/debug';
import CharacterRecognitionService from '../services/characterRecognition';
import { paginateContent, PaginationResult, getPageForPosition, getPositionForPage } from '../utils/pagination';
import { getSegmentsForPage } from '../services/segmentation';
import PaginationControls from '../components/PaginationControls';
import SegmentedText from '../components/SegmentedText';
import WordLookupModal from '../components/WordLookupModal';
import CompleteReadingButton from '../components/CompleteReadingButton';
import ReadingStatsPanel from '../components/ReadingStatsPanel';
import ArticleMenu from '../components/ArticleMenu';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Font settings (should match your app's settings)
const FONT_SIZE = 18;
const LINE_HEIGHT = 32;

type ArticleDetailScreenRouteProp = RouteProp<RootStackParamList, 'ArticleDetail'>;
type ArticleDetailScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ArticleDetailScreen() {
  const route = useRoute<ArticleDetailScreenRouteProp>();
  const navigation = useNavigation<ArticleDetailScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { articleId } = route.params;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [needsPagination, setNeedsPagination] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Word lookup state
  const [selectedWord, setSelectedWord] = useState<SegmentedWord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Character recognition state
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Article character stats
  const [distinctCharCount, setDistinctCharCount] = useState(0);
  const [unknownCharCount, setUnknownCharCount] = useState(0);

  // Menu state
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    loadArticle();
    
    // Cleanup: cancel session if component unmounts without completing
    return () => {
      if (currentSessionId && !hasCompleted) {
        CharacterRecognitionService.cancelReadingSession(currentSessionId);
      }
    };
  }, [articleId]);

  const loadArticle = async () => {
    DebugService.log('ARTICLE_VIEW', 'Loading article', { articleId });
    
    try {
      const data = await StorageService.getArticleById(articleId);
      if (data) {
        DebugService.log('ARTICLE_VIEW', 'Article loaded', { 
          hasSegments: !!data.segments,
          segmentsCount: data.segments?.length,
          contentLength: data.content?.length
        });
        
        setArticle(data);
        
        // Calculate pagination
        const paginationResult = paginateContent(
          data.content,
          screenWidth - 40, // Account for padding
          screenHeight,
          FONT_SIZE,
          LINE_HEIGHT
        );
        
        DebugService.log('ARTICLE_VIEW', 'Pagination calculated', {
          needsPagination: paginationResult.needsPagination,
          totalPages: paginationResult.totalPages,
          pagesLength: paginationResult.pages.length
        });
        
        setPages(paginationResult.pages);
        setTotalPages(paginationResult.totalPages);
        setNeedsPagination(paginationResult.needsPagination);
        
        // Initialize character recognition session
        const sessionId = await CharacterRecognitionService.startReadingSession(articleId);
        setCurrentSessionId(sessionId);
        
        // Extract all Chinese characters and words
        const allChars = data.content.match(/[\u4e00-\u9fa5]/g) || [];
        const allWords = data.segments
          ?.filter(s => s.type === 'chinese')
          .map(s => s.text) || [];
        
        await CharacterRecognitionService.trackDisplayedContent(sessionId, allChars, allWords, articleId);

        // Load article meta from DB (or compute and save if not yet computed)
        let meta = await CharacterRecognitionService.getArticleMeta(articleId);
        if (!meta) {
          meta = await CharacterRecognitionService.saveArticleMeta(articleId, data.content, allWords);
        }
        setDistinctCharCount(meta.uniqueChars);
        setUnknownCharCount(meta.unknownChars);

        // Load saved reading progress
        const savedProgress = await StorageService.getReadingProgress(articleId);
        if (savedProgress) {
          const targetPage = Math.min(savedProgress.currentPage, paginationResult.totalPages - 1);
          setCurrentPage(targetPage);
          // Scroll to saved page after a short delay
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: targetPage,
              animated: false,
            });
          }, 100);
        }
      } else {
        DebugService.log('ARTICLE_VIEW', 'Article not found', { articleId });
      }
    } catch (error) {
      DebugService.logError('ARTICLE_VIEW', 'Error loading article', error);
    } finally {
      setLoading(false);
    }
  };

  // Save reading progress when page changes
  const saveProgress = useCallback(async (page: number) => {
    if (!article) return;
    
    const progress: ReadingProgress = {
      articleId,
      currentPage: page,
      totalPages,
      lastReadAt: Date.now(),
    };
    
    try {
      await StorageService.saveReadingProgress(progress);
    } catch (error) {
      console.error('Error saving reading progress:', error);
    }
  }, [article, articleId, totalPages]);

  const handleEdit = () => {
    navigation.navigate('ArticleEditor', { articleId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Article',
      'Are you sure you want to delete this article?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteArticle(articleId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete article');
            }
          },
        },
      ]
    );
  };

  const handleCompleteReading = async () => {
    if (currentSessionId) {
      await CharacterRecognitionService.completeReadingSession(currentSessionId);

      // Refresh article meta (unknown count may have changed after familiarity update)
      if (article) {
        const allWords = article.segments
          ?.filter(s => s.type === 'chinese')
          .map(s => s.text) || [];
        CharacterRecognitionService.saveArticleMeta(articleId, article.content, allWords)
          .catch(err => console.warn('[article] Failed to refresh article meta:', err));
      }

      setHasCompleted(true);
      navigation.goBack();
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      flatListRef.current?.scrollToIndex({
        index: newPage,
        animated: true,
      });
      saveProgress(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      flatListRef.current?.scrollToIndex({
        index: newPage,
        animated: true,
      });
      saveProgress(newPage);
    }
  };

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    if (page !== currentPage && page >= 0 && page < totalPages) {
      setCurrentPage(page);
      saveProgress(page);
    }
  }, [currentPage, totalPages, width, saveProgress]);

  const handleWordPress = async (word: SegmentedWord) => {
    DebugService.log('ARTICLE_VIEW', 'Word pressed', { 
      word: word.text, 
      start: word.start, 
      end: word.end,
      isInDictionary: word.isInDictionary 
    });
    
    // Track word lookup for character recognition
    if (currentSessionId) {
      await CharacterRecognitionService.markWordAsLookedUp(currentSessionId, word.text);
    }
    
    setSelectedWord(word);
    setModalVisible(true);
  };

  // menu items handlers
  const onPressEdit = useCallback(() => {
    setMenuVisible(false);
    handleEdit();
  }, [handleEdit]);

  const onPressDelete = useCallback(() => {
    setMenuVisible(false);
    handleDelete();
  }, [handleDelete]);

  const isLastPage = currentPage === totalPages - 1;
  const showCompleteButton = isLastPage && !hasCompleted;

  const renderPage = ({ item, index }: { item: string; index: number }) => {
    // Calculate page boundaries
    let pageStart = 0;
    for (let i = 0; i < index; i++) {
      pageStart += pages[i].length;
    }
    const pageEnd = pageStart + item.length;
    
    DebugService.log('ARTICLE_VIEW', `Rendering page ${index}`, { pageStart, pageEnd });
    
    // Get segments for this page
    const pageSegments = article?.segments
      ? getSegmentsForPage(article.segments, pageStart, pageEnd)
      : [];

    DebugService.log('ARTICLE_VIEW', `Page ${index} segments`, { 
      count: pageSegments.length,
      hasSegments: pageSegments.length > 0 
    });

    const isLastPageItem = index === pages.length - 1;

    return (
      <View style={[styles.pageContainer, { width }]}>
        <ScrollView style={styles.pageScrollView} contentContainerStyle={styles.pageScrollContent}>
          <View style={styles.pageContent}>
            {pageSegments.length > 0 ? (
              <SegmentedText
                segments={pageSegments}
                content={item}
                onWordPress={handleWordPress}
                fontSize={FONT_SIZE}
                lineHeight={LINE_HEIGHT}
              />
            ) : (
              <Text style={styles.contentText}>{item}</Text>
            )}
          </View>

          {isLastPageItem && (
            <View style={styles.bottomSection}>
              <ReadingStatsPanel articleId={articleId} sessionId={currentSessionId} />
              {showCompleteButton && (
                <CompleteReadingButton
                  onComplete={handleCompleteReading}
                  disabled={false}
                />
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.container}>
        <Text variant="bodyLarge">Article not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Paper Appbar Header */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content 
          title={article.title || 'Article'} 
          subtitle={needsPagination ? `Page ${currentPage + 1} of ${totalPages}` : undefined}
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action 
              icon="dots-vertical" 
              onPress={() => setMenuVisible(true)} 
            />
          }
        >
          <Menu.Item 
            onPress={onPressEdit}
            title="Edit" 
            leadingIcon="pencil" 
          />
          <Menu.Item 
            onPress={onPressDelete}
            title="Delete" 
            leadingIcon="delete" 
          />
        </Menu>
      </Appbar.Header>

      {/* Header Info Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>{article.title || 'Untitled'}</Text>
          <View style={styles.metaContainer}>
            <Text variant="bodyMedium" style={styles.metaText}>
              {article.wordCount} characters
            </Text>
            {distinctCharCount > 0 && (
              <>
                <Text variant="bodyMedium" style={styles.metaText}> • </Text>
                <Text variant="bodyMedium" style={styles.metaText}>
                  {distinctCharCount} unique
                </Text>
                <Text variant="bodyMedium" style={styles.metaText}> • </Text>
                <Text variant="bodyMedium" style={[styles.metaText, unknownCharCount > 0 && styles.metaTextHighlight]}>
                  {unknownCharCount} unknown
                </Text>
              </>
            )}
          </View>
          {article.source && (
            <Text variant="bodySmall" style={styles.source}>Source: {article.source}</Text>
          )}
        </Card.Content>
      </Card>

      {/* Content */}
      <View style={styles.contentWrapper}>
        {needsPagination ? (
          <FlatList
            ref={flatListRef}
            data={pages}
            renderItem={renderPage}
            keyExtractor={(_, index) => `page-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />
        ) : (
          <ScrollView style={styles.singlePageContainer} contentContainerStyle={styles.singlePageContent}>
            <Card style={styles.pageContent}>
              <Card.Content>
                {article?.segments && article.segments.length > 0 ? (
                  <SegmentedText
                    segments={article.segments}
                    content={article.content}
                    onWordPress={handleWordPress}
                    fontSize={FONT_SIZE}
                    lineHeight={LINE_HEIGHT}
                  />
                ) : (
                  <Text variant="bodyLarge" style={styles.contentText}>{article.content}</Text>
                )}
              </Card.Content>
            </Card>

            {/* Stats & Complete Reading - inline below content */}
            <View style={styles.bottomSection}>
              <ReadingStatsPanel articleId={articleId} sessionId={currentSessionId} />
            </View>
          </ScrollView>
        )}
      </View>

      {/* Pagination Controls */}
      {needsPagination && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      )}

      {/* Complete Reading FAB */}
      {showCompleteButton && (
        <FAB
          icon="check"
          label="Complete"
          onPress={handleCompleteReading}
          style={styles.fab}
        />
      )}

      {/* Word Lookup Modal */}
      <WordLookupModal
        visible={modalVisible}
        word={selectedWord}
        onClose={() => {
          setModalVisible(false);
          setSelectedWord(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: 16,
    marginTop: 8,
  },
  title: {
    marginBottom: 12,
    lineHeight: 32,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  metaTextHighlight: {
    color: '#FF9500',
    fontWeight: '600',
  },
  source: {
    marginTop: 8,
    fontStyle: 'italic',
  },
  contentWrapper: {
    flex: 1,
  },
  singlePageContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  singlePageContent: {
    paddingBottom: 100, // Extra space for FAB
  },
  pageContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pageScrollView: {
    flex: 1,
  },
  pageScrollContent: {
    paddingBottom: 100, // Extra space for FAB
  },
  pageContent: {
    marginBottom: 16,
  },
  contentText: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
  },
  bottomSection: {
    marginTop: 16,
    gap: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});