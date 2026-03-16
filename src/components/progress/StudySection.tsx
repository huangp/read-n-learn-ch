import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';

export default function StudySection() {
  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          Smart Review Queue
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Review words based on spaced repetition. Focus on words you struggle with.
        </Text>
        <Button mode="contained" style={styles.button}>
          Start Review Session
        </Button>
      </Surface>

      <Surface style={styles.card} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          Problem Words
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Words you've looked up multiple times. Practice these to improve retention.
        </Text>
        <Button mode="outlined" style={styles.button}>
          View Problem Words
        </Button>
      </Surface>

      <Surface style={styles.card} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          Daily Goal
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Set and track your daily word review goal.
        </Text>
        <Button mode="outlined" style={styles.button}>
          Set Daily Goal
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 16,
    color: '#666',
  },
  button: {
    marginTop: 8,
  },
});
