import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, Dimensions, ScrollView, StyleSheet, useWindowDimensions, View,} from 'react-native';
import {ActivityIndicator, Appbar, Card, FAB, Menu, Text,} from 'react-native-paper';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {Article, ReadingProgress, RootStackParamList, SegmentedWord} from '../types';
import {StorageService} from '../services/storage';
import DebugService from '../services/debug';
import CharacterRecognitionService from '../services/characterRecognition';
import SegmentedText from '../components/SegmentedText';
import WordLookupModal from '../components/WordLookupModal';
import CompleteReadingButton from '../components/CompleteReadingButton';
import ReadingStatsPanel from '../components/ReadingStatsPanel';
import {getDefaultFontSize, getLineHeightForFontSize} from './SettingsScreen';

const { height: screenHeight } = Dimensions.get('window');

type ArticleDetailScreenRouteProp = RouteProp<RootStackParamList, 'ArticleDetail'>;
type ArticleDetailScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ArticleDetailScreen() {
  const route = useRoute<ArticleDetailScreenRouteProp>();
  const navigation = useNavigation<ArticleDetailScreenNavigationProp>();

  const { articleId } = route.params;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Scroll tracking state
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const contentHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(screenHeight);
  
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
  
  // Font settings state
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(32);

  useEffect(() => {
    // Load font size setting
    const loadFontSettings = async () => {
      const savedFontSize = await getDefaultFontSize();
      setFontSize(savedFontSize);
      setLineHeight(getLineHeightForFontSize(savedFontSize));
    };
    loadFontSettings();
  }, []);

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
          const percentage = Math.min(savedProgress.scrollPercentage, 100);
          setScrollPercentage(percentage);
          // Scroll to saved position after layout
          setTimeout(() => {
            if (contentHeightRef.current > 0) {
              const scrollY = (percentage / 100) * Math.max(0, contentHeightRef.current - scrollViewHeightRef.current);
              scrollViewRef.current?.scrollTo({ y: scrollY, animated: false });
            }
          }, 200);
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

  // Save reading progress when scroll changes
  const saveProgress = useCallback(async (percentage: number) => {
    if (!article) return;
    
    const progress: ReadingProgress = {
      articleId,
      scrollPercentage: Math.min(Math.round(percentage), 100),
      lastReadAt: Date.now(),
    };
    
    try {
      await StorageService.saveReadingProgress(progress);
    } catch (error) {
      console.error('Error saving reading progress:', error);
    }
  }, [article, articleId]);

  // Debounced scroll handler
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    
    contentHeightRef.current = contentSize.height;
    scrollViewHeightRef.current = layoutMeasurement.height;
    
    const scrollableHeight = Math.max(0, contentSize.height - layoutMeasurement.height);
    let percentage = 0;
    
    if (scrollableHeight > 0) {
      percentage = Math.min(100, Math.round((contentOffset.y / scrollableHeight) * 100));
    } else if (contentSize.height > 0) {
      // Content fits in viewport, consider it 100% viewed
      percentage = 100;
    }
    
    setScrollPercentage(percentage);
    
    // Debounce saving progress
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      saveProgress(percentage);
    }, 500);
  }, [saveProgress]);

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
        try {
          await CharacterRecognitionService.saveArticleMeta(articleId, article.content, allWords);
        } catch (err) {
          console.warn('[article] Failed to refresh article meta:', err);
        }
      }

      setHasCompleted(true);
      navigation.goBack();
    }
  };

  const handleWordPress = async (word: SegmentedWord) => {
    DebugService.log('WORD_LOOKUP', 'Word pressed', { 
      word: word.text,
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

  // Show complete button when scrolled near bottom (90%+) or content is short
  const showCompleteButton = (scrollPercentage >= 90 || contentHeightRef.current <= scrollViewHeightRef.current) && !hasCompleted;

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
          subtitle={`${scrollPercentage}% read`}
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
      <ScrollView
        ref={scrollViewRef}
        style={styles.contentContainer}
        contentContainerStyle={styles.contentContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.contentWrapper}>
          {article?.segments && article.segments.length > 0 ? (
            <SegmentedText
              segments={article.segments}
              content={article.content}
              onWordPress={handleWordPress}
              fontSize={fontSize}
              lineHeight={lineHeight}
            />
          ) : (
            <Text variant="bodyLarge" style={styles.contentText}>{article.content}</Text>
          )}
        </View>

        {/* Stats & Complete Reading - inline below content */}
        <View style={styles.bottomSection}>
          <ReadingStatsPanel articleId={articleId} sessionId={currentSessionId} />
        </View>
      </ScrollView>

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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContent: {
    paddingBottom: 100, // Extra space for FAB
  },
  contentWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contentText: {
    fontSize: 18,
    lineHeight: 32,
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
