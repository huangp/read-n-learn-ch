import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SegmentedWord } from '../types';

interface SegmentedTextProps {
  segments: SegmentedWord[];
  content: string;
  onWordPress: (word: SegmentedWord) => void;
  fontSize?: number;
  lineHeight?: number;
}

export default function SegmentedText({
  segments,
  content: _content,
  onWordPress,
  fontSize = 18,
  lineHeight = 32,
}: SegmentedTextProps) {

  const renderSegment = (segment: SegmentedWord) => {
    // Paragraph break
    if (segment.text === '\n\n' || segment.text === '\r\n\r\n' || segment.text === '\r\r') {
      return <View key={segment.id} style={styles.paragraphBreak} />;
    }

    // Line break
    if (segment.text === '\n' || segment.text === '\r\n' || segment.text === '\r') {
      return <View key={segment.id} style={styles.lineBreak} />;
    }

    // Non-Chinese content (punctuation, numbers, etc.) — not clickable
    if (segment.type === 'other') {
      return (
        <Text key={segment.id} style={[styles.wordText, { fontSize, lineHeight }]}>
          {segment.text}
        </Text>
      );
    }

    // Chinese word — tappable, no pinyin shown inline
    return (
      <TouchableOpacity
        key={segment.id}
        onPress={() => onWordPress(segment)}
        activeOpacity={0.5}
      >
        <Text
          style={[
            styles.wordText,
            styles.chineseWord,
            { fontSize, lineHeight },
          ]}
        >
          {segment.text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {segments.map((segment) => renderSegment(segment))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  wordText: {
    color: '#333',
  },
  chineseWord: {
    // Subtle underline-dot to hint that words are tappable
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#ccc',
  },
  lineBreak: {
    width: '100%',
    height: 0,
  },
  paragraphBreak: {
    width: '100%',
    height: 16,
  },
});