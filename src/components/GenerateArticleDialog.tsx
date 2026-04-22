import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Dialog,
  Portal,
  Text,
  TextInput,
  Button,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';

const PRESET_TOPICS = [
  'culture',
  'food',
  'festival',
  '成语',
  'history',
  '诗词',
  'song',
  'travel',
];

interface GenerateArticleDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onGenerate: (topic: string | undefined) => void;
  isGenerating: boolean;
}

export function GenerateArticleDialog({
  visible,
  onDismiss,
  onGenerate,
  isGenerating,
}: GenerateArticleDialogProps) {
  const [topic, setTopic] = useState('');

  const handleSelectTopic = (selectedTopic: string) => {
    setTopic(selectedTopic);
  };

  const handleGenerate = () => {
    const trimmedTopic = topic.trim();
    onGenerate(trimmedTopic || undefined);
    setTopic('');
  };

  const handleDismiss = () => {
    setTopic('');
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss}>
        <Dialog.Title>Generate Article</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.description}>
            Select a topic or enter your own. Leave empty for a random topic.
          </Text>

          <TextInput
            label="Topic (optional)"
            placeholder="Enter custom topic..."
            value={topic}
            onChangeText={setTopic}
            mode="outlined"
            style={styles.textInput}
            disabled={isGenerating}
          />

          <Text variant="bodySmall" style={styles.suggestionsLabel}>
            Suggested topics:
          </Text>

          <View style={styles.chipsContainer}>
            {PRESET_TOPICS.map((presetTopic) => (
              <Chip
                key={presetTopic}
                selected={topic === presetTopic}
                onPress={() => handleSelectTopic(presetTopic)}
                style={styles.chip}
                showSelectedCheck={false}
                disabled={isGenerating}
              >
                {presetTopic}
              </Chip>
            ))}
          </View>

          {isGenerating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating={true} size="small" />
              <Text variant="bodySmall" style={styles.loadingText}>
                Generating article...
              </Text>
            </View>
          )}
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={handleDismiss} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onPress={handleGenerate}
            disabled={isGenerating}
            loading={isGenerating}
            mode="contained"
          >
            Generate
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  description: {
    marginBottom: 16,
    color: '#666',
  },
  textInput: {
    marginBottom: 16,
  },
  suggestionsLabel: {
    marginBottom: 8,
    color: '#666',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginBottom: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#666',
  },
});
