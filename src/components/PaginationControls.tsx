import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onPagePress?: (page: number) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onPagePress,
}: PaginationControlsProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      {/* Previous Button */}
      <TouchableOpacity
        style={[styles.button, !canGoPrevious && styles.buttonDisabled]}
        onPress={onPrevious}
        disabled={!canGoPrevious}
      >
        <Text style={[styles.buttonText, !canGoPrevious && styles.buttonTextDisabled]}>
          ←
        </Text>
      </TouchableOpacity>

      {/* Page Indicator */}
      <TouchableOpacity
        style={styles.pageIndicator}
        onPress={() => onPagePress?.(currentPage)}
        disabled={!onPagePress}
      >
        <Text style={styles.pageText}>
          {currentPage + 1} / {totalPages}
        </Text>
      </TouchableOpacity>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.button, !canGoNext && styles.buttonDisabled]}
        onPress={onNext}
        disabled={!canGoNext}
      >
        <Text style={[styles.buttonText, !canGoNext && styles.buttonTextDisabled]}>
          →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 20,
  },
  containerTablet: {
    paddingHorizontal: 40,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  pageIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  pageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});