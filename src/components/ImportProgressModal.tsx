import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Modal,
  Portal,
  ProgressBar,
  Text,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import type { ImportProgress } from '../services/backup';

interface ImportProgressModalProps {
  visible: boolean;
  progress: ImportProgress | null;
  onDone: () => void;
}

export function ImportProgressModal({ visible, progress, onDone }: ImportProgressModalProps) {
  const isComplete = progress?.step === 'complete';

  const getProgressValue = (): number => {
    if (!progress || progress.total === 0) return 0;
    return progress.current / progress.total;
  };

  const getStepIcon = (): string => {
    if (isComplete) return 'check-circle';
    return 'cloud-download';
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {isComplete ? (
              <ActivityIndicator animating={false} size={64} color="#4CAF50" />
            ) : (
              <ActivityIndicator animating={true} size={64} />
            )}
          </View>

          <Text variant="headlineSmall" style={styles.title}>
            {isComplete ? 'Restore Complete!' : 'Restoring from Cloud'}
          </Text>

          <Text variant="bodyMedium" style={styles.message}>
            {progress?.message ?? 'Preparing...'}
          </Text>

          {!isComplete && (
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={getProgressValue()}
                style={styles.progressBar}
              />
              <Text variant="bodySmall" style={styles.progressText}>
                {progress && progress.total > 1
                  ? `${progress.current} / ${progress.total}`
                  : ''}
              </Text>
            </View>
          )}

          {isComplete && (
            <Button
              mode="contained"
              onPress={onDone}
              style={styles.doneButton}
            >
              Done
            </Button>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    margin: 0,
    padding: 0,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#666',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#999',
  },
  doneButton: {
    marginTop: 8,
    width: '100%',
  },
});
