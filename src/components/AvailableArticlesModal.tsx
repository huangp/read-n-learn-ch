import React from 'react';
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { 
  Text, 
  IconButton, 
  Button,
} from 'react-native-paper';
import type { ObjectInfo } from '../api/generated';

interface AvailableArticlesModalProps {
  visible: boolean;
  onClose: () => void;
  articles: ObjectInfo[];
  onSubscribe: () => void;
}

export function AvailableArticlesModal({ 
  visible, 
  onClose, 
  articles,
  onSubscribe,
}: AvailableArticlesModalProps) {

  const articlesToDisplay = articles.length < 5 ? articles : articles.slice(0, 5);
  const eclipses = articles.length > articlesToDisplay.length ?
      (<Text style={styles.articleTitle}>... and {articles.length - articlesToDisplay.length} more</Text>) : null;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.container}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>
              New Articles Available
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text variant="bodyMedium" style={styles.description}>
              {articles.length} article{articles.length === 1 ? '' : 's'} available to sync.
              {'\n'}Subscribe to access them on your device.
            </Text>

            <View style={styles.articleList}>
              {articlesToDisplay.map((article, index) => (
                <Text key={article.key || index} style={styles.articleTitle}>
                  {`- ${article.title || 'Untitled'}`}
                </Text>
              ))}
              {eclipses}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={onSubscribe}
              style={styles.subscribeButton}
              contentStyle={styles.subscribeButtonContent}
            >
              Subscribe to Sync
            </Button>
            <Button
              mode="text"
              onPress={onClose}
              style={styles.closeTextButton}
            >
              Maybe Later
            </Button>
          </View>
        </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modal: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  container: {
    backgroundColor: '#fff',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    margin: 0,
  },
  content: {
    padding: 20,
  },
  scrollContent: {
    minHeight: '40%',
  },
  description: {
    textAlign: 'left',
    marginBottom: 10,
    lineHeight: 24,
    color: '#495057',
  },
  articleList: {
    gap: 8,
  },
  articleTitle: {
    fontSize: 12,
    lineHeight: 14,
    color: '#343a40',
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 8,
  },
  subscribeButton: {
    borderRadius: 12,
  },
  subscribeButtonContent: {
    height: 48,
  },
  closeTextButton: {
    alignSelf: 'center',
  },
});
