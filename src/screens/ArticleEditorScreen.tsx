import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Portal,
  Modal,
  ActivityIndicator,
  Dialog,
  List,
  Snackbar,
} from 'react-native-paper';
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
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [importDialogVisible, setImportDialogVisible] = useState(false);

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

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      showSnackbar('Please enter some content');
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
      showSnackbar('Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const chineseCharCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;

  const handleImportDocument = async () => {
    setImporting(true);
    try {
      const result = await FileProcessingService.pickDocument();
      if (result.success && result.text) {
        setContent(result.text);
        if (result.title) setTitle(result.title);
        if (result.source) setSource(result.source);
        showSnackbar('Document imported successfully!');
      } else if (result.error && result.error !== 'User cancelled') {
        showSnackbar(`Import Error: ${result.error}`);
      }
    } catch (error) {
      showSnackbar('Failed to import document');
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
        
        showSnackbar(
          `${result.results.length} image${result.results.length > 1 ? 's' : ''} imported successfully!`
        );
      } else if (result.error && result.error !== 'User cancelled') {
        // Show detailed error with failed image names
        if (result.failedImages && result.failedImages.length > 0) {
          const failedList = result.failedImages.join(', ');
          showSnackbar(
            `${result.error}. Failed images: ${failedList}. Please try again with different images.`
          );
        } else {
          showSnackbar(`Import Error: ${result.error}`);
        }
      }
    } catch (error) {
      showSnackbar('Failed to import images');
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
    setImportDialogVisible(true);
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
          <TextInput
            label="Title"
            placeholder="Enter article title (optional)"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            mode="outlined"
            style={styles.titleInput}
          />
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            label="Source"
            placeholder="Where did this article come from? (optional)"
            value={source}
            onChangeText={setSource}
            maxLength={500}
            mode="outlined"
            style={styles.sourceInput}
          />
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            label="Content"
            placeholder="Paste or type Chinese text here..."
            value={content}
            onChangeText={setContent}
            multiline
            mode="outlined"
            style={styles.contentInput}
            autoFocus={!isEditing}
            right={<TextInput.Affix text={`${chineseCharCount} chars`} />}
          />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, isTablet ? styles.bottomBarRow : styles.bottomBarColumn]}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={saving || importing}
          style={styles.bottomButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained-tonal"
          onPress={showImportOptions}
          disabled={saving || importing}
          loading={importing && processingProgress.total === 0}
          icon="import"
          style={styles.bottomButton}
        >
          Import
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={saving || importing}
          loading={saving}
          icon="content-save"
          style={[styles.bottomButton, styles.saveButton]}
        >
          {isEditing ? 'Update' : 'Save'}
        </Button>
      </View>

      {/* Import Options Dialog */}
      <Portal>
        <Dialog visible={importDialogVisible} onDismiss={() => setImportDialogVisible(false)}>
          <Dialog.Title>Import File</Dialog.Title>
          <Dialog.Content>
            <List.Item
              title="Document"
              description="PDF, DOCX, TXT files"
              left={props => <List.Icon {...props} icon="file-document" />}
              onPress={() => {
                setImportDialogVisible(false);
                handleImportDocument();
              }}
            />
            <List.Item
              title="Image"
              description="Photos with text (OCR)"
              left={props => <List.Icon {...props} icon="image" />}
              onPress={() => {
                setImportDialogVisible(false);
                handleImportImage();
              }}
            />
            <List.Item
              title="Camera Scan"
              description="Scan text with camera"
              left={props => <List.Icon {...props} icon="camera" />}
              onPress={() => {
                setImportDialogVisible(false);
                handleCameraScan();
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setImportDialogVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Processing Overlay */}
      <Portal>
        <Modal
          visible={importing && processingProgress.total > 0}
          dismissable={false}
          contentContainerStyle={styles.processingModal}
        >
          <ActivityIndicator size="large" />
          <Text variant="titleMedium" style={styles.processingText}>
            Processing image {processingProgress.current} of {processingProgress.total}...
          </Text>
          <Text variant="bodyMedium" style={styles.processingSubtext}>
            Extracting text with OCR
          </Text>
        </Modal>
      </Portal>

      {/* Snackbar for messages */}
      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          action={{
            label: 'Dismiss',
            onPress: () => setSnackbarVisible(false),
          }}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>
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
    padding: 16,
  },
  contentContainerTablet: {
    paddingHorizontal: 40,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 18,
  },
  sourceInput: {
    fontSize: 16,
  },
  contentInput: {
    minHeight: 300,
    fontSize: 18,
    lineHeight: 28,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  bottomBarRow: {
    flexDirection: 'row',
  },
  bottomBarColumn: {
    flexDirection: 'column',
  },
  bottomButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1.5,
  },
  processingModal: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 32,
    margin: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  processingSubtext: {
    color: '#aaa',
    marginTop: 8,
  },
});
