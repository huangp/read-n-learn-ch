import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CharacterRecognitionService from '../services/characterRecognition';

interface ReadingStatsPanelProps {
  articleId: string;
  sessionId: number | null;
}

interface Stats {
  totalVocabulary: number;
  knownVocabulary: number;
  learningVocabulary: number;
  unknownVocabulary: number;
  totalSessions: number;
  totalLookups: number;
}

export default function ReadingStatsPanel({ articleId, sessionId }: ReadingStatsPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    loadStats();
  }, [sessionId]);

  const loadStats = async () => {
    try {
      const data = await CharacterRecognitionService.getOverallStats();
      setStats(data);
    } catch (err) {
      console.warn('[ReadingStatsPanel] Failed to load stats:', err);
    }
  };

  if (!stats) return null;

  const knownPct = stats.totalVocabulary > 0
    ? Math.round((stats.knownVocabulary / stats.totalVocabulary) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Vocabulary Recognition</Text>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarKnown, { flex: stats.knownVocabulary || 0 }]} />
        <View style={[styles.progressBarLearning, { flex: stats.learningVocabulary || 0 }]} />
        <View style={[styles.progressBarUnknown, { flex: stats.unknownVocabulary || 1 }]} />
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
          <Text style={styles.legendText}>Known</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
          <Text style={styles.legendText}>Learning</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E0E0E0' }]} />
          <Text style={styles.legendText}>New</Text>
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.grid}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.totalVocabulary}</Text>
          <Text style={styles.statLabel}>Vocabulary{'\n'}Seen</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#34C759' }]}>{stats.knownVocabulary}</Text>
          <Text style={styles.statLabel}>Known{'\n'}({knownPct}%)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#FF9500' }]}>{stats.learningVocabulary}</Text>
          <Text style={styles.statLabel}>Learning</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.totalLookups}</Text>
          <Text style={styles.statLabel}>Lookups</Text>
        </View>
      </View>

      <View style={styles.sessionRow}>
        <Text style={styles.sessionText}>
          {stats.totalSessions} reading session{stats.totalSessions !== 1 ? 's' : ''} completed
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarKnown: {
    backgroundColor: '#34C759',
  },
  progressBarLearning: {
    backgroundColor: '#FF9500',
  },
  progressBarUnknown: {
    backgroundColor: '#E0E0E0',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#888',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statBox: {
    alignItems: 'center',
    minWidth: 60,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
  sessionRow: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  sessionText: {
    fontSize: 13,
    color: '#999',
  },
});

