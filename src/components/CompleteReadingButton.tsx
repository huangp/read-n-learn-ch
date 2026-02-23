import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';

interface CompleteReadingButtonProps {
  onComplete: () => void;
  disabled?: boolean;
}

export default function CompleteReadingButton({
  onComplete,
  disabled = false,
}: CompleteReadingButtonProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onComplete}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Complete Reading</Text>
        <Text style={styles.subText}>Mark characters as reviewed</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  button: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  subText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
});