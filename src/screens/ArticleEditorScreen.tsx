import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, ArticleFormData } from '../types';
import { StorageService } from '../services/storage';
import { FileProcessingService } from '../services/fileProcessing';

type ArticleEditorScreenRouteProp = RouteProp<RootStackParamList, 'ArticleEditor'>;
type ArticleEditorScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ArticleEditorScreen() {
  const route = useRoute<ArticleEditorScreenRouteProp>();
  const navigation = useNavigation<ArticleEditorScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { articleId } = route.params || {};
  const isEditing = !!articleId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (isEditing) {
      loadArticle();
    }
  }, [articleId]);

  const loadArticle = async () => {
    try {
      const article = await StorageService.getArticleById(articleId!);
      if (article) {
        setTitle(article.title);
        setContent(article.content);
        setSource(article.source || '');
      }
    } catch (error) {
      console.error('Error loading article:', error);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    setSaving(true);
    try {
      const formData: ArticleFormData = {
        title: title.trim() || 'Untitled',
        content: content.trim(),
        source: source.trim() || undefined,
      };

      await StorageService.saveArticle(formData, articleId);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const charCount = content.length;
  const chineseCharCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;

  const handleImportDocument = async () => {
    setImporting(true);
    try {
      const result = await FileProcessingService.pickDocument();
      if (result.success && result.text) {
        setContent(result.text);
        if (result.title) setTitle(result.title);
        if (result.source) setSource(result.source);
        Alert.alert('Success', 'Document imported successfully!');
      } else if (result.error && result.error !== 'User cancelled') {
        Alert.alert('Import Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import document');
    } finally {
      setImporting(false);
    }
  };

  const handleImportImage = async () => {
    setImporting(true);
    setProcessingProgress({ current: 0, total: 0 });
    
    try {
      const result = await FileProcessingService.pickMultipleImages(
        (current, total) => {
          setProcessingProgress({ current, total });
        }
      );
      
      if (result.success && result.results && result.results.length > 0) {
        // Combine all texts with separator, maintaining order
        const allTexts = result.results.map(r => r.text).filter(Boolean) as string[];
        const combinedText = allTexts.join('\n\n---\n\n');
        
        // Use first successful result for title and source
        const firstResult = result.results[0];
        
        setContent(prev => {
          if (prev.trim()) {
            return prev + '\n\n---\n\n' + combinedText;
          }
          return combinedText;
        });
        
        if (firstResult.title) setTitle(firstResult.title);
        if (firstResult.source) setSource(`Gallery Import (${result.results.length} images)`);
        
        Alert.alert(
          'Success', 
          `${result.results.length} image${result.results.length > 1 ? 's' : ''} imported successfully!`
        );
      } else if (result.error && result.error !== 'User cancelled') {
        // Show detailed error with failed image names
        if (result.failedImages && result.failedImages.length > 0) {
          const failedList = result.failedImages.join(', ');
          Alert.alert(
            'Import Error',
            `${result.error}\n\nFailed images: ${failedList}\n\nPlease try again with different images.`
          );
        } else {
          Alert.alert('Import Error', result.error);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import images');
    } finally {
      setImporting(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
  };

  const handleCameraScan = () => {
    navigation.navigate('Camera', {
      onCapture: (text: string, title?: string, source?: string) => {
        setContent(prev => {
          // If there's existing content, append with separator
          if (prev.trim()) {
            return prev + '\n\n---\n\n' + text;
          }
          return text;
        });
        if (title) setTitle(title);
        if (source) setSource(source);
      },
    });
  };

  const showImportOptions = () => {
    Alert.alert(
      'Import File',
      'Choose the type of file to import',
      [
        { text: 'Document (PDF, DOCX, TXT)', onPress: handleImportDocument },
        { text: 'Image (with text)', onPress: handleImportImage },
        { text: 'Camera Scan', onPress: handleCameraScan },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          isTablet && styles.contentContainerTablet,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Enter article title (optional)"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Source</Text>
          <TextInput
            style={styles.sourceInput}
            placeholder="Where did this article come from? (optional)"
            value={source}
            onChangeText={setSource}
            maxLength={500}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Content</Text>
            <Text style={styles.charCount}>
              {chineseCharCount} Chinese chars • {charCount} total
            </Text>
          </View>
          <TextInput
            style={styles.contentInput}
            placeholder="Paste or type Chinese text here..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            autoFocus={!isEditing}
          />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={saving || importing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.importButton, importing && styles.saveButtonDisabled]}
          onPress={showImportOptions}
          disabled={saving || importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.importButtonText}>Import</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || importing}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Processing Overlay */}
      <Modal visible={importing && processingProgress.total > 0} transparent={true} animationType="fade">
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>
            Processing image {processingProgress.current} of {processingProgress.total}...
          </Text>
          <Text style={styles.processingSubtext}>Extracting text with OCR</Text>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
  },
  titleInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sourceInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  contentInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    fontSize: 18,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 300,
    lineHeight: 28,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600',
  },
  processingSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
});
