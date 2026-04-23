import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SegmentedWord} from '../types';
import {alignPinyinWithContent, groupSegmentsBySentences, SentenceBlock} from '../utils/pinyinAlignment';
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
        <SentenceBlockView
          key={`sentence-${index}`}
          block={block}
          index={index}
          fontSize={fontSize}
          lineHeight={lineHeight}
          onWordPress={onWordPress}
        />
      ))}
    </View>
  );
}

interface SentenceBlockViewProps {
  block: SentenceBlock;
  index: number;
  fontSize: number;
  lineHeight: number;
  onWordPress: (word: SegmentedWord) => void;
}

function SentenceBlockView({
  block,
  index,
  fontSize,
  lineHeight,
  onWordPress,
}: SentenceBlockViewProps) {
  // Build pinyin display: if we have per-character matches, render each character
  // with its pinyin above it. Otherwise, fall back to the full pinyin string.
  const pinyinContent = useMemo(() => {
    if (block.matches && block.matches.length > 0) {
      return block.matches;
    }
    return null;
  }, [block.matches]);

  return (
    <View key={`sentence-${index}`} style={styles.sentenceBlock}>
      {pinyinContent ? (
        // Per-character pinyin display
        <View style={styles.pinyinCharactersContainer}>
          {pinyinContent.map((match, charIndex) => (
            <View key={`char-${charIndex}`} style={styles.characterColumn}>
              <Text
                style={[
                  styles.pinyinChar,
                  {fontSize: fontSize * 0.65, lineHeight: lineHeight * 0.7},
                ]}
              >
                {match.pinyin || ' '}
              </Text>
              <Text
                style={[
                  styles.chineseChar,
                  {fontSize, lineHeight},
                ]}
              >
                {match.char}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        // Fallback: full pinyin string above segmented text
        <>
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
        </>
      )}
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
  pinyinCharactersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  characterColumn: {
    alignItems: 'center',
    marginRight: 1,
  },
  pinyinChar: {
    color: '#1976d2',
    fontWeight: '500',
    textAlign: 'center',
    minWidth: 20,
  },
  chineseChar: {
    textAlign: 'center',
    minWidth: 20,
  },
});
