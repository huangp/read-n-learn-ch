import { matchPinyinToChars, PinyinMatch } from './pinyinMatch';
import type { SegmentedWord } from '../types';

// ==================== Types ====================

export interface AlignedPinyinSegment {
  /** Chinese text including trailing punctuation */
  chinese: string;
  /** Pinyin for this segment (without trailing punctuation) */
  pinyin: string;
  /** Per-character pinyin matches (null if alignment failed) */
  matches: PinyinMatch[] | null;
  /** Word segments for this portion */
  segments: SegmentedWord[];
}

export interface SentenceBlock {
  /** Full pinyin string for the sentence (for backward compatibility) */
  pinyin: string;
  /** Word segments in this sentence */
  segments: SegmentedWord[];
  /** Per-character pinyin matches */
  matches: PinyinMatch[] | null;
  /** Chinese text for this sentence */
  chinese: string;
}

// ==================== Constants ====================

/** Sentence-ending punctuation marks */
const SENTENCE_END_DELIMITERS = /[。！？]/;

/** Pattern to strip from pinyin (punctuation and extra whitespace) */
const PINYIN_NOISE_PATTERN = /[。，！？；：、\.\,\!\?\;\:\n\s]+/g;

// ==================== Main Functions ====================

/**
 * Align server-provided pinyin with Chinese content by splitting into natural segments
 * and using matchPinyinToChars for per-character alignment.
 *
 * Natural segments are broken at:
 * - Sentence endings (。！？)
 * - Clause boundaries (，；：、)
 * - Paragraph breaks (\n\n)
 * - Line breaks (\n)
 *
 * @param content - Chinese text with punctuation
 * @param pinyin - Server-provided pinyin string
 * @returns Array of aligned segments with per-character pinyin matches
 */
export function alignPinyinWithContent(
  content: string,
  pinyin: string
): AlignedPinyinSegment[] {
  if (!content || !pinyin) {
    return [];
  }

  // Clean the pinyin string (remove punctuation, normalize whitespace)
  const cleanPinyin = stripPinyinNoise(pinyin);
  
  // Match pinyin to all characters first
  const allMatches = matchPinyinToChars(content, cleanPinyin);
  
  // Split content into natural segments
  const contentSegments = splitIntoNaturalSegments(content);
  
  // Distribute matches across segments
  const result: AlignedPinyinSegment[] = [];
  let matchIdx = 0;
  
  for (const chinese of contentSegments) {
    const charCount = Array.from(chinese).filter(c => /\p{Script=Han}/u.test(c)).length;
    
    // Extract matches for this segment
    let segmentMatches: PinyinMatch[] | null = null;
    let segmentPinyin = '';
    
    if (allMatches && matchIdx < allMatches.length) {
      // Count how many matches we need for this segment
      const endIdx = Math.min(matchIdx + charCount, allMatches.length);
      segmentMatches = allMatches.slice(matchIdx, endIdx);
      segmentPinyin = segmentMatches.map(m => m.pinyin).filter(p => p).join(' ');
      matchIdx = endIdx;
    }
    
    result.push({
      chinese,
      pinyin: segmentPinyin,
      matches: segmentMatches,
      segments: [], // Will be populated by groupSegmentsBySentences
    });
  }
  
  return result;
}

/**
 * Group SegmentedWord[] into sentence-level blocks that align with
 * AlignedPinyinSegment[].
 *
 * This function:
 * 1. Normalizes segments by splitting merged punctuation (e.g., "。我的" → ["。", "我的"])
 * 2. Groups segments into sentences based on the aligned segments
 * 3. Attaches whitespace-only segments to the preceding sentence
 */
export function groupSegmentsBySentences(
  segments: SegmentedWord[],
  alignedSegments: AlignedPinyinSegment[]
): SentenceBlock[] {
  const normalizedSegments = normalizeSegments(segments);
  const result: SentenceBlock[] = [];
  let segIdx = 0;

  for (let i = 0; i < alignedSegments.length; i++) {
    const aligned = alignedSegments[i];
    const isLast = i === alignedSegments.length - 1;
    // Strip leading/trailing whitespace from target for length comparison
    // since segments don't include whitespace markers like \n\n
    const target = aligned.chinese.trim();
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
      matches: aligned.matches,
      chinese: aligned.chinese,
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

// ==================== Helper Functions ====================

/**
 * Split Chinese content into natural segments based on punctuation.
 *
 * Strategy:
 * 1. Split by sentence-ending delimiters (。！？) to create sentence boundaries
 * 2. Keep delimiters attached to preceding text
 * 3. Handle paragraph breaks (\n\n) as visual separators but preserve them
 */
function splitIntoNaturalSegments(content: string): string[] {
  // Pattern to split on sentence-ending punctuation while keeping it
  const sentencePattern = /([。！？]+)/g;
  
  const parts = content.split(sentencePattern);
  const segments: string[] = [];
  
  for (let i = 0; i < parts.length; i += 2) {
    const textPart = parts[i] || '';
    const delimiters = parts[i + 1] || '';
    const fullSegment = textPart + delimiters;
    
    if (fullSegment.length > 0) {
      segments.push(fullSegment);
    }
  }
  
  // Handle any trailing content without delimiters
  if (parts.length % 2 === 1) {
    const last = parts[parts.length - 1];
    if (last && last.length > 0 && !segments.includes(last)) {
      segments.push(last);
    }
  }
  
  return segments.filter(s => s.length > 0);
}

/**
 * Strip punctuation and normalize whitespace in a pinyin string.
 * This prepares pinyin for matching against Chinese characters.
 */
function stripPinyinNoise(pinyin: string): string {
  return pinyin
    .replace(PINYIN_NOISE_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
