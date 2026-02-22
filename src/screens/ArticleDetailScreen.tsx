import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Article, RootStackParamList } from '../types';
import { StorageService } from '../services/storage';

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

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  const loadArticle = async () => {
    try {
      const data = await StorageService.getArticleById(articleId);
      if (data) {
        setArticle(data);
        navigation.setOptions({ title: data.title || 'Article' });
      }
    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          isTablet && styles.contentContainerTablet,
        ]}
      >
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
          </View>
          {article.source && (
            <Text style={styles.source}>Source: {article.source}</Text>
          )}
        </View>

        <View style={styles.contentBox}>
          <Text style={styles.content}>{article.content}</Text>
        </View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerTablet: {
    paddingHorizontal: 40,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
  contentBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    fontSize: 18,
    lineHeight: 32,
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
