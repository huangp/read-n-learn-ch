/**
 * Align server-provided pinyin with Chinese content by splitting on punctuation.
 *
 * The server pinyin string includes the same punctuation marks as the content
 * (e.g. "nǐ hǎo ， shì jiè 。"). We split both strings by sentence delimiters
 * to create aligned segments.
 */

const SENTENCE_DELIMITERS = /([。，！？；：、])/g;

export interface AlignedPinyinSegment {
  /** Chinese text including trailing punctuation */
  chinese: string;
  /** Pinyin for this segment (without trailing punctuation) */
  pinyin: string;
}

/**
 * Split content and pinyin into aligned segments by punctuation.
 *
 * Strategy:
 * 1. Split content by delimiters while keeping delimiters attached to preceding text
 * 2. Split pinyin by delimiters (after normalizing spaces around them)
 * 3. Match them up 1:1
 */
export function alignPinyinWithContent(
  content: string,
  pinyin: string
): AlignedPinyinSegment[] {
  if (!content || !pinyin) {
    return [];
  }

  // Split content by delimiters, keeping delimiters attached
  const chineseParts = splitByDelimiters(content, SENTENCE_DELIMITERS);

  // Normalize pinyin: ensure spaces around delimiters so split works cleanly
  const normalizedPinyin = normalizePinyinSpacing(pinyin);
  const pinyinParts = splitByDelimiters(normalizedPinyin, SENTENCE_DELIMITERS);

  // Match parts up
  const result: AlignedPinyinSegment[] = [];
  const count = Math.min(chineseParts.length, pinyinParts.length);

  for (let i = 0; i < count; i++) {
    const chinese = chineseParts[i].trim();
    const pinyinPart = stripTrailingPunctuation(pinyinParts[i]).trim();

    if (chinese || pinyinPart) {
      result.push({ chinese, pinyin: pinyinPart });
    }
  }

  return result;
}

/**
 * Split text by a delimiter regex, keeping the delimiter attached to the
 * preceding text segment.
 */
function splitByDelimiters(text: string, delimiterRegex: RegExp): string[] {
  // Split with capturing group to keep delimiters
  const parts = text.split(delimiterRegex);
  const segments: string[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    const textPart = parts[i] || '';
    const delimiter = parts[i + 1] || '';
    segments.push(textPart + delimiter);
  }

  // Handle trailing text without delimiter
  if (parts.length % 2 === 1 && parts[parts.length - 1]) {
    const last = parts[parts.length - 1];
    if (last && !segments.includes(last)) {
      segments.push(last);
    }
  }

  return segments.filter(s => s.length > 0);
}

/**
 * Normalize spaces around punctuation in pinyin string so that
 * splitting by delimiters produces clean segments.
 *
 * The server may return English punctuation (,.!?;:) instead of
 * Chinese punctuation（，。！？；：）, so we normalize first.
 */
function normalizePinyinSpacing(pinyin: string): string {
  return pinyin
    // Convert English punctuation to Chinese equivalents
    .replace(/,/g, '，')
    .replace(/\./g, '。')
    .replace(/!/g, '！')
    .replace(/\?/g, '？')
    .replace(/;/g, '；')
    .replace(/:/g, '：')
    // Ensure spaces around delimiters
    .replace(/\s*([。，！？；：、])\s*/g, ' $1 ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove trailing Chinese punctuation from a pinyin segment.
 */
function stripTrailingPunctuation(text: string): string {
  return text.replace(/[。，！？；：、]\s*$/g, '').trim();
}

import type { SegmentedWord } from '../types';

/**
 * Group SegmentedWord[] into sentence-level blocks that align with
 * AlignedPinyinSegment[].
 *
 * Algorithm:
 * 1. Normalize segments by splitting any segment that contains sentence
 *    delimiters (。！？) at positions other than the end. Server segments
 *    often merge a sentence-ending punctuation with the next word
 *    (e.g. "。我的" → must become "。" + "我的").
 * 2. Walk through normalized segments, greedily filling each target sentence.
 *    A segment belongs to the current sentence if:
 *      - Adding it doesn't overshoot the target length, OR
 *      - The segment is the ending punctuation of the target
 *    Whitespace-only segments (like "\n\n") that appear between sentences
 *    are attached to the preceding sentence's trailing block (so they are
 *    preserved in order but don't affect alignment).
 */
export function groupSegmentsBySentences(
  segments: SegmentedWord[],
  alignedSegments: AlignedPinyinSegment[]
): { pinyin: string; segments: SegmentedWord[] }[] {
  const normalizedSegments = normalizeSegments(segments);

  const result: { pinyin: string; segments: SegmentedWord[] }[] = [];
  let segIdx = 0;

  for (let i = 0; i < alignedSegments.length; i++) {
    const aligned = alignedSegments[i];
    const isLast = i === alignedSegments.length - 1;
    const target = aligned.chinese;
    const blockSegments: SegmentedWord[] = [];
    let accumulated = '';

    // Skip leading whitespace-only segments - attach them to previous block
    while (
      segIdx < normalizedSegments.length &&
      isWhitespaceOnly(normalizedSegments[segIdx].text)
    ) {
      if (result.length > 0) {
        result[result.length - 1].segments.push(normalizedSegments[segIdx]);
      } else {
        blockSegments.push(normalizedSegments[segIdx]);
      }
      segIdx++;
    }

    // Consume segments until we've matched the target length
    while (
      segIdx < normalizedSegments.length &&
      accumulated.length < target.length
    ) {
      const seg = normalizedSegments[segIdx];
      const nextLen = accumulated.length + seg.text.length;

      // Don't overshoot unless this is the last sentence
      if (nextLen > target.length && !isLast) {
        break;
      }

      blockSegments.push(seg);
      accumulated += seg.text;
      segIdx++;
    }

    result.push({
      pinyin: aligned.pinyin,
      segments: blockSegments,
    });
  }

  // Append any remaining segments to the last block
  if (segIdx < normalizedSegments.length && result.length > 0) {
    const lastBlock = result[result.length - 1];
    while (segIdx < normalizedSegments.length) {
      lastBlock.segments.push(normalizedSegments[segIdx]);
      segIdx++;
    }
  }

  return result;
}

/**
 * Normalize segments by splitting any segment where a sentence-ending
 * punctuation mark (。！？) or mid-sentence delimiter (，；：、) appears
 * at a non-final position followed by more text.
 *
 * Example: "。我的" → ["。", "我的"]
 * Example: "，也" → ["，", "也"]
 */
function normalizeSegments(segments: SegmentedWord[]): SegmentedWord[] {
  const result: SegmentedWord[] = [];
  let nextId = 0;
  const DELIMITER_CHARS = /[。，！？；：、]/;

  for (const seg of segments) {
    if (!DELIMITER_CHARS.test(seg.text) || seg.text.length <= 1) {
      result.push(seg);
      continue;
    }

    // Split into runs of delimiter-vs-non-delimiter characters
    let current = '';
    let currentIsDelim = DELIMITER_CHARS.test(seg.text[0] ?? '');
    const parts: { text: string; isDelim: boolean }[] = [];

    for (const ch of seg.text) {
      const isDelim = DELIMITER_CHARS.test(ch);
      if (isDelim === currentIsDelim) {
        current += ch;
      } else {
        if (current) parts.push({ text: current, isDelim: currentIsDelim });
        current = ch;
        currentIsDelim = isDelim;
      }
    }
    if (current) parts.push({ text: current, isDelim: currentIsDelim });

    if (parts.length === 1) {
      result.push(seg);
      continue;
    }

    for (const part of parts) {
      result.push({
        id: `norm-${nextId++}`,
        text: part.text,
        type: part.isDelim ? ('other' as const) : ('chinese' as const),
      });
    }
  }

  return result;
}

function isWhitespaceOnly(text: string): boolean {
  return /^\s+$/.test(text);
}
