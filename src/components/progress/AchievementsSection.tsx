import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, ProgressBar } from 'react-native-paper';

export default function AchievementsSection() {
  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          Reading Streak
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Keep your streak going by reading every day!
        </Text>
        <View style={styles.streakContainer}>
          <Text variant="headlineLarge" style={styles.streakNumber}>
            0
          </Text>
          <Text variant="bodyMedium">days</Text>
        </View>
      </Surface>

      <Surface style={styles.card} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          Achievement Badges
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Unlock badges by reaching milestones in your learning journey.
        </Text>
        <View style={styles.badgesContainer}>
          <Text variant="bodySmall" style={styles.comingSoon}>
            🏃‍♂️ First Steps - Read first article
          </Text>
          <Text variant="bodySmall" style={styles.comingSoon}>
            📚 Bookworm - Read 10 articles
          </Text>
          <Text variant="bodySmall" style={styles.comingSoon}>
            🧠 Vocabulary Builder - Learn 50 words
          </Text>
          <Text variant="bodySmall" style={styles.comingSoon}>
            🔥 On Fire - 7-day streak
          </Text>
        </View>
      </Surface>

      <Surface style={styles.card} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          Overall Progress
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Your vocabulary mastery breakdown.
        </Text>
        <View style={styles.progressContainer}>
          <Text variant="bodySmall">Known Words</Text>
          <ProgressBar progress={0} style={styles.progressBar} />
          <Text variant="bodySmall">Learning</Text>
          <ProgressBar progress={0} style={styles.progressBar} />
          <Text variant="bodySmall">New Words</Text>
          <ProgressBar progress={1} style={styles.progressBar} />
        </View>
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
  streakContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  streakNumber: {
    fontWeight: 'bold',
    color: '#FF9500',
  },
  badgesContainer: {
    gap: 8,
  },
  comingSoon: {
    color: '#999',
    paddingVertical: 4,
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    marginBottom: 8,
  },
});
