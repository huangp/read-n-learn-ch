import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';

export default function StatsSection() {
  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          Learning Statistics
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Track your vocabulary growth, reading time, and learning velocity over time.
        </Text>
      </Surface>

      <Surface style={styles.card} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          HSK Progress
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Monitor your mastery of HSK vocabulary levels 1-6.
        </Text>
      </Surface>

      <Surface style={styles.card} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          Reading Stats
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Total articles read, reading time, and words looked up.
        </Text>
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
    color: '#666',
  },
});
