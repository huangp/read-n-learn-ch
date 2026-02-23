import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  Dimensions,
  ScrollView,
} from 'react-native';
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

        // Set up navigation header with menu
        navigation.setOptions({
          title: data.title || 'Article',
          headerRight: () => (
            <ArticleMenu 
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ),
        });
        
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
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.container}>
        <Text>Article not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{article.title || 'Untitled'}</Text>
        <View style={styles.metaContainer}>
          <Text style={styles.metaText}>
            {article.wordCount} characters
          </Text>
          <Text style={styles.metaText}> • </Text>
          <Text style={styles.metaText}>
            {new Date(article.updatedAt).toLocaleDateString()}
          </Text>
          {needsPagination && (
            <>
              <Text style={styles.metaText}> • </Text>
              <Text style={styles.metaText}>
                Page {currentPage + 1} of {totalPages}
              </Text>
            </>
          )}
        </View>
        {article.source && (
          <Text style={styles.source}>Source: {article.source}</Text>
        )}
      </View>

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
            <View style={styles.pageContent}>
              {article?.segments && article.segments.length > 0 ? (
                <SegmentedText
                  segments={article.segments}
                  content={article.content}
                  onWordPress={handleWordPress}
                  fontSize={FONT_SIZE}
                  lineHeight={LINE_HEIGHT}
                />
              ) : (
                <Text style={styles.contentText}>{article.content}</Text>
              )}
            </View>

            {/* Stats & Complete Reading - inline below content */}
            <View style={styles.bottomSection}>
              <ReadingStatsPanel articleId={articleId} sessionId={currentSessionId} />
              {showCompleteButton && (
                <CompleteReadingButton
                  onComplete={handleCompleteReading}
                  disabled={false}
                />
              )}
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
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    lineHeight: 32,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  source: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  contentWrapper: {
    flex: 1,
  },
  singlePageContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  singlePageContent: {
    paddingBottom: 20,
  },
  pageContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pageScrollView: {
    flex: 1,
  },
  pageScrollContent: {
    paddingBottom: 20,
  },
  pageContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentText: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    color: '#333',
  },
  bottomSection: {
    marginTop: 16,
    gap: 8,
  },
});