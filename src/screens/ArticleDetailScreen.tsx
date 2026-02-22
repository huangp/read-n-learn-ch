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
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Article, RootStackParamList, ReadingProgress } from '../types';
import { StorageService } from '../services/storage';
import { paginateContent, PaginationResult } from '../utils/pagination';
import PaginationControls from '../components/PaginationControls';

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

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  const loadArticle = async () => {
    try {
      const data = await StorageService.getArticleById(articleId);
      if (data) {
        setArticle(data);
        navigation.setOptions({ title: data.title || 'Article' });
        
        // Calculate pagination
        const paginationResult = paginateContent(
          data.content,
          screenWidth - 40, // Account for padding
          screenHeight,
          FONT_SIZE,
          LINE_HEIGHT
        );
        
        setPages(paginationResult.pages);
        setTotalPages(paginationResult.totalPages);
        setNeedsPagination(paginationResult.needsPagination);
        
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
      }
    } catch (error) {
      console.error('Error loading article:', error);
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

  const renderPage = ({ item, index }: { item: string; index: number }) => (
    <View style={[styles.pageContainer, { width }]}>
      <View style={styles.pageContent}>
        <Text style={styles.contentText}>{item}</Text>
      </View>
    </View>
  );

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
        <View style={styles.singlePageContainer}>
          <View style={styles.pageContent}>
            <Text style={styles.contentText}>{article.content}</Text>
          </View>
        </View>
      )}

      {/* Pagination Controls */}
      {needsPagination && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
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
  singlePageContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pageContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pageContent: {
    flex: 1,
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
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
});