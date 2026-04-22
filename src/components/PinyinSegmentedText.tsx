import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SegmentedWord} from '../types';
import {alignPinyinWithContent, groupSegmentsBySentences} from '../utils/pinyinAlignment';
import SegmentedText from './SegmentedText';

interface PinyinSegmentedTextProps {
  segments: SegmentedWord[];
  content: string;
  serverPinyin: string;
  onWordPress: (word: SegmentedWord) => void;
  fontSize?: number;
  lineHeight?: number;
}

export default function PinyinSegmentedText({
  segments,
  content,
  serverPinyin,
  onWordPress,
  fontSize = 18,
  lineHeight = 32,
}: PinyinSegmentedTextProps) {
  const sentenceBlocks = useMemo(() => {
    const aligned = alignPinyinWithContent(content, serverPinyin);
    return groupSegmentsBySentences(segments, aligned);
  }, [segments, content, serverPinyin]);

  return (
    <View style={styles.container}>
      {sentenceBlocks.map((block, index) => (
        <View key={`sentence-${index}`} style={styles.sentenceBlock}>
          <Text
            style={[
              styles.pinyinLine,
              {fontSize: fontSize * 0.75, lineHeight: lineHeight * 0.75},
            ]}
          >
            {block.pinyin}
          </Text>
          <View style={styles.chineseLine}>
            <SegmentedText
              segments={block.segments}
              content={block.segments.map(s => s.text).join('')}
              onWordPress={onWordPress}
              fontSize={fontSize}
              lineHeight={lineHeight}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sentenceBlock: {
    marginBottom: 8,
  },
  pinyinLine: {
    color: '#1976d2',
    fontWeight: '500',
    marginBottom: 2,
  },
  chineseLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
