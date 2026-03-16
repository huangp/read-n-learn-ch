import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface, ActivityIndicator, IconButton } from 'react-native-paper';
import { progressService } from '../../services/progressService';
import type { DailyStats, OverallLearningStats } from '../../utils/database/progress';
import CalendarGrid, { DayData } from './CalendarGrid';

// Convert DailyStats to DayData format
function convertToDayData(stats: DailyStats[]): DayData[] {
  return stats.map(s => ({
    date: s.date,
    vocabularyKnown: s.vocabularyKnown,
    articlesRead: s.articlesRead,
    vocabularyExposed: s.vocabularyExposed,
  }));
}

// Get week range based on offset (0 = current week ending today, 1 = previous week, etc.)
function getWeekRange(offset: number): { startDate: number; endDate: number } {
  const now = new Date();
  
  // Calculate end date (today minus offset weeks)
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  endDate.setDate(endDate.getDate() - (offset * 7));
  
  // Calculate start date (6 days before end date)
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);
  
  return {
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
  };
}

// Format date range for display (e.g., "Jan 1 - Jan 7, 2024")
function formatDateRange(startDate: number, endDate: number): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  return `${startStr} - ${endStr}`;
}

// Parse YYYY-MM-DD date string and create date in local timezone
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Format date for detail display
function formatDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

export default function StatsSection() {
  const [dailyStats, setDailyStats] = useState<DayData[]>([]);
  const [overallStats, setOverallStats] = useState<OverallLearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dateRange, setDateRange] = useState<string>('');

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getWeekRange(weekOffset);
      setDateRange(formatDateRange(startDate, endDate));
      
      // Load both daily stats and overall stats
      const [dailyStatsResult, overallStatsResult] = await Promise.all([
        progressService.getDailyStats(startDate, endDate),
        progressService.getOverallLearningStats(),
      ]);
      
      const dayData = convertToDayData(dailyStatsResult);
      setDailyStats(dayData);
      setOverallStats(overallStatsResult);
      
      // Select the last day of the week by default (most recent)
      if (dayData.length > 0) {
        const lastDay = dayData[dayData.length - 1];
        setSelectedDate(lastDay.date);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handlePreviousWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(prev => Math.max(0, prev - 1));
  };

  const selectedDayData = selectedDate 
    ? dailyStats.find(d => d.date === selectedDate) 
    : null;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text variant="titleLarge" style={styles.mainTitle}>
        Learning Statistics
      </Text>

      {/* Navigation Header */}
      <View style={styles.navigationHeader}>
        <TouchableOpacity 
          onPress={handlePreviousWeek}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <IconButton icon="chevron-left" size={24} style={styles.navIcon} />
          <Text variant="bodyMedium" style={styles.navText}>Previous</Text>
        </TouchableOpacity>

        <Text variant="titleMedium" style={styles.dateRange}>
          {dateRange}
        </Text>

        <TouchableOpacity 
          onPress={handleNextWeek}
          style={[styles.navButton, weekOffset === 0 && styles.navButtonDisabled]}
          disabled={weekOffset === 0}
          activeOpacity={0.7}
        >
          <Text variant="bodyMedium" style={[styles.navText, weekOffset === 0 && styles.navTextDisabled]}>
            Next
          </Text>
          <IconButton 
            icon="chevron-right" 
            size={24} 
            style={styles.navIcon}
            disabled={weekOffset === 0}
          />
        </TouchableOpacity>
      </View>

      {/* Calendar Grid */}
      <CalendarGrid
        days={dailyStats}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* Detail Section */}
      {selectedDayData && (
        <Surface style={styles.detailCard} elevation={2}>
          <Text variant="titleMedium" style={styles.detailDate}>
            {formatDate(selectedDayData.date)}
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#34C759' }]} />
              <View>
                <Text variant="headlineSmall" style={styles.statValue}>
                  {selectedDayData.vocabularyKnown}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Vocabulary Became Known
                </Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#007AFF' }]} />
              <View>
                <Text variant="headlineSmall" style={styles.statValue}>
                  {selectedDayData.articlesRead}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Articles Read
                </Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FF9500' }]} />
              <View>
                <Text variant="headlineSmall" style={styles.statValue}>
                  {selectedDayData.vocabularyExposed.toLocaleString()}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Vocabulary Exposed
                </Text>
              </View>
            </View>
          </View>
        </Surface>
      )}

      {/* Empty State */}
      {!selectedDayData && (
        <Surface style={styles.emptyCard} elevation={1}>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Select a day to see detailed statistics
          </Text>
        </Surface>
      )}

      {/* Overall Progress Section */}
      {overallStats && (
        <Surface style={styles.overallCard} elevation={2}>
          <Text variant="titleMedium" style={styles.overallTitle}>
            Overall Progress
          </Text>
          
          <View style={styles.overallStatsRow}>


            <View style={styles.overallStatItem}>
              <Text variant="headlineMedium" style={styles.overallStatValue}>
                {overallStats.totalVocabularyKnown.toLocaleString()}
              </Text>
              <Text variant="bodySmall" style={styles.overallStatLabel}>
                Vocabulary Known
              </Text>
              <View style={[styles.overallStatBar, { backgroundColor: '#34C759' }]} />
            </View>

            <View style={styles.overallStatDivider} />

            <View style={styles.overallStatItem}>
              <Text variant="headlineMedium" style={styles.overallStatValue}>
                {overallStats.totalArticlesRead.toLocaleString()}
              </Text>
              <Text variant="bodySmall" style={styles.overallStatLabel}>
                Articles Read
              </Text>
              <View style={[styles.overallStatBar, { backgroundColor: '#007AFF' }]} />
            </View>

            <View style={styles.overallStatDivider} />

            <View style={styles.overallStatItem}>
              <Text variant="headlineMedium" style={styles.overallStatValue}>
                {overallStats.totalVocabularyExposed.toLocaleString()}
              </Text>
              <Text variant="bodySmall" style={styles.overallStatLabel}>
                Vocabulary Exposed
              </Text>
              <View style={[styles.overallStatBar, { backgroundColor: '#FF9500' }]} />
            </View>

          </View>
        </Surface>
      )}
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
  mainTitle: {
    marginBottom: 4,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navIcon: {
    margin: 0,
    padding: 0,
  },
  navText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  navTextDisabled: {
    color: '#999',
  },
  dateRange: {
    fontWeight: '600',
    color: '#333',
  },
  detailCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  detailDate: {
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statValue: {
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    color: '#666',
  },
  emptyCard: {
    marginTop: 16,
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
  },
  overallCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  overallTitle: {
    marginBottom: 16,
    color: '#333',
  },
  overallStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  overallStatValue: {
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  overallStatLabel: {
    color: '#666',
    textAlign: 'center',
  },
  overallStatBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  overallStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E0E0E0',
  },
});
