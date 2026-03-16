import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';

export interface DayData {
  date: string;
  vocabularyKnown: number;
  articlesRead: number;
  vocabularyExposed: number;
}

interface CalendarGridProps {
  days: DayData[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

// Fixed scale maximums for consistent bar heights across metrics
const VOCABULARY_KNOWN_SCALE_MAX = 50;
const ARTICLES_SCALE_MAX = 10;
const VOCABULARY_EXPOSED_SCALE_MAX = 500;
const MAX_BAR_HEIGHT = 80; // 80% of 100px container

// Calculate bar height based on fixed scale maximums
function calculateBarHeight(value: number, scaleMax: number): number {
  if (value === 0) return 0;
  const percentage = Math.min(value / scaleMax, 1);
  const height = percentage * MAX_BAR_HEIGHT;
  return Math.max(height, 4); // Minimum 4px for visibility
}

// Parse YYYY-MM-DD date string and create date in local timezone
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Get day name from date string (Mon, Tue, etc.)
function getDayName(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Get day number from date string
function getDayNumber(dateStr: string): number {
  const date = parseLocalDate(dateStr);
  return date.getDate();
}

export default function CalendarGrid({ days, selectedDate, onSelectDate }: CalendarGridProps) {
  // Fixed scale maximums are used instead of dynamic max values
  // This ensures bars show relative differences between metrics

  return (
    <Surface style={styles.container} elevation={1}>
      <View style={styles.grid}>
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          const hasActivity = day.vocabularyKnown > 0 || day.articlesRead > 0 || day.vocabularyExposed > 0;

          return (
            <TouchableOpacity
              key={day.date}
              onPress={() => onSelectDate(day.date)}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              activeOpacity={0.7}
            >
              <Text style={styles.dayName}>{getDayName(day.date)}</Text>
              <Text style={styles.dayNumber}>{getDayNumber(day.date)}</Text>
              
              <View style={styles.barsContainer}>
                {/* Vocabulary Known - Green */}
                <View 
                  style={[
                    styles.bar, 
                    styles.barVocabularyKnown,
                    { height: calculateBarHeight(day.vocabularyKnown, VOCABULARY_KNOWN_SCALE_MAX) }
                  ]} 
                />
                
                {/* Articles Read - Blue */}
                <View 
                  style={[
                    styles.bar, 
                    styles.barArticles,
                    { height: calculateBarHeight(day.articlesRead, ARTICLES_SCALE_MAX) }
                  ]} 
                />
                
                {/* Vocabulary Exposed - Orange */}
                <View 
                  style={[
                    styles.bar, 
                    styles.barVocabularyExposed,
                    { height: calculateBarHeight(day.vocabularyExposed, VOCABULARY_EXPOSED_SCALE_MAX) }
                  ]} 
                />
              </View>

              {hasActivity && <View style={styles.activityIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendVocabularyKnown]} />
          <Text style={styles.legendText}>Vocabulary Known</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendArticles]} />
          <Text style={styles.legendText}>Articles Read</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendVocabularyExposed]} />
          <Text style={styles.legendText}>Vocabulary Exposed</Text>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  dayCellSelected: {
    backgroundColor: '#E3F2FD',
  },
  dayName: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 2,
  },
  bar: {
    width: 8,
    borderRadius: 2,
  },
  barVocabularyKnown: {
    backgroundColor: '#34C759',
  },
  barArticles: {
    backgroundColor: '#007AFF',
  },
  barVocabularyExposed: {
    backgroundColor: '#FF9500',
  },
  activityIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#34C759',
    marginTop: 6,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
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
  legendVocabularyKnown: {
    backgroundColor: '#34C759',
  },
  legendArticles: {
    backgroundColor: '#007AFF',
  },
  legendVocabularyExposed: {
    backgroundColor: '#FF9500',
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
});
