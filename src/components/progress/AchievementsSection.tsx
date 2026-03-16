import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { progressService, BadgeProgress } from '../../services/progressService';
import type { ReadingStreak } from '../../utils/database/progress';

export default function AchievementsSection() {
  const [streak, setStreak] = useState<ReadingStreak | null>(null);
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const [streakData, badgesData] = await Promise.all([
        progressService.getReadingStreak(),
        progressService.getBadgeProgress(),
      ]);
      setStreak(streakData);
      setBadges(badgesData);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  const unlockedCount = badges.filter(b => b.isUnlocked).length;
  const totalCount = badges.length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Reading Streak Card */}
      <Surface style={styles.card} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          Reading Streak
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Keep your streak going by reading every day!
        </Text>
        
        <View style={styles.streakContainer}>
          <View style={styles.streakItem}>
            <Text variant="headlineLarge" style={styles.streakNumber}>
              {streak?.currentStreak || 0}
            </Text>
            <Text variant="bodyMedium" style={styles.streakLabel}>
              Current Streak
            </Text>
          </View>
          
          <View style={styles.streakDivider} />
          
          <View style={styles.streakItem}>
            <Text variant="headlineLarge" style={[styles.streakNumber, styles.streakNumberSecondary]}>
              {streak?.longestStreak || 0}
            </Text>
            <Text variant="bodyMedium" style={styles.streakLabel}>
              Longest Streak
            </Text>
          </View>
        </View>
      </Surface>

      {/* Achievement Badges Card */}
      <Surface style={styles.card} elevation={2}>
        <View style={styles.badgesHeader}>
          <View>
            <Text variant="titleLarge" style={styles.title}>
              Achievement Badges
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Unlock badges by reaching milestones
            </Text>
          </View>
          <View style={styles.progressBadge}>
            <Text variant="titleLarge" style={styles.progressText}>
              {unlockedCount}/{totalCount}
            </Text>
          </View>
        </View>

        <View style={styles.badgesContainer}>
          {badges.map((badge) => (
            <View 
              key={badge.id} 
              style={[styles.badgeItem, badge.isUnlocked && styles.badgeItemUnlocked]}
            >
              <View style={styles.badgeHeader}>
                <Text variant="titleMedium" style={styles.badgeName}>
                  {badge.name}
                </Text>
                {badge.isUnlocked && (
                  <View style={styles.unlockedBadge}>
                    <Text variant="bodySmall" style={styles.unlockedText}>Unlocked</Text>
                  </View>
                )}
              </View>
              
              <Text variant="bodySmall" style={styles.badgeDescription}>
                {badge.description}
              </Text>
              
              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={Math.min(badge.current / badge.target, 1)}
                  color={badge.isUnlocked ? '#34C759' : '#007AFF'}
                  style={styles.progressBar}
                />
                <Text variant="bodySmall" style={styles.progressLabel}>
                  {badge.id.startsWith('hsk_') 
                    ? `${badge.current}%` 
                    : `${badge.current}/${badge.target}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  title: {
    marginBottom: 4,
  },
  description: {
    marginBottom: 16,
    color: '#666',
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  streakItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  streakNumber: {
    fontWeight: 'bold',
    color: '#FF9500',
  },
  streakNumberSecondary: {
    color: '#666',
  },
  streakLabel: {
    marginTop: 4,
    color: '#666',
  },
  streakDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E0E0E0',
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  progressBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  progressText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  badgesContainer: {
    gap: 12,
  },
  badgeItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  badgeItemUnlocked: {
    backgroundColor: '#E8F5E9',
    borderColor: '#34C759',
  },
  badgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeName: {
    fontWeight: '600',
  },
  unlockedBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unlockedText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
  },
  badgeDescription: {
    color: '#666',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    color: '#666',
    minWidth: 45,
    textAlign: 'right',
  },
});
