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
const SENTENCE_END_DELIMITERS = /([。！？]+)/g;

/** All Chinese punctuation marks */
const ALL_DELIMITERS = /[。，！？；：、]/g;

/** Pattern to strip from pinyin (punctuation and extra whitespace) */
const PINYIN_NOISE_PATTERN = /[。，！？；：、""''""'\'\.\,\!\?\;\:\n\s]+/g;

// ==================== Main Functions ====================

/**
 * Align server-provided pinyin with Chinese content by splitting into natural segments
 * and using matchPinyinToChars for per-character alignment.
 *
 * Strategy:
 * 1. Split content by sentence-ending delimiters (。！？) keeping delimiters attached
 * 2. Normalize pinyin punctuation (convert English to Chinese) and split by same delimiters
 * 3. Match content segments with pinyin segments 1:1
 * 4. Use matchPinyinToChars on each segment pair for per-character alignment
 *
 * This ensures each segment's pinyin exactly matches its content characters.
 */
export function alignPinyinWithContent(
  content: string,
  pinyin: string
): AlignedPinyinSegment[] {
  if (!content || !pinyin) {
    return [];
  }

  // Normalize content: convert English punctuation to Chinese equivalents
  const normalizedContent = normalizeContentPunctuation(content);

  // Split content by sentence delimiters, keeping delimiters attached to preceding text
  const contentSegments = splitByDelimiters(normalizedContent, SENTENCE_END_DELIMITERS);

  // Normalize pinyin: convert English punctuation to Chinese equivalents
  const normalizedPinyin = normalizePinyinSpacing(pinyin);
  const pinyinSegments = splitByDelimiters(normalizedPinyin, SENTENCE_END_DELIMITERS);

  // Match parts up and align pinyin per segment
  const result: AlignedPinyinSegment[] = [];
  const count = Math.min(contentSegments.length, pinyinSegments.length);

  for (let i = 0; i < count; i++) {
    const chinese = contentSegments[i].trim();
    const pinyinPart = stripTrailingPunctuation(pinyinSegments[i]).trim();

    if (chinese || pinyinPart) {
      // Use matchPinyinToChars for per-character alignment
      const matches = matchPinyinToChars(chinese, pinyinPart);

      result.push({
        chinese,
        pinyin: pinyinPart,
        matches,
        segments: [], // Will be populated by groupSegmentsBySentences
      });
    }
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
 * Also handles Chinese quotes and other punctuation.
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

/**
 * Normalize content punctuation by converting English punctuation
 * to Chinese equivalents so that splitting by delimiters works consistently.
 */
function normalizeContentPunctuation(content: string): string {
  return content
    .replace(/\?/g, '？')
    .replace(/!/g, '！')
    .replace(/,/g, '，')
    .replace(/\./g, '。')
    .replace(/;/g, '；')
    .replace(/:/g, '：');
}

// ==================== Alignment Validation ====================

/**
 * Check if pinyin can be structurally aligned with content.
 *
 * Validates that both content and pinyin split into the same number of
 * sentence segments when divided by sentence-ending punctuation (。！？).
 * This ensures a basic structural match before attempting per-character alignment.
 */
export function canAlignPinyin(content: string, pinyin: string): boolean {
  if (!content || !pinyin) {
    return false;
  }

  // Normalize content punctuation
  const normalizedContent = normalizeContentPunctuation(content);

  // Split both by sentence delimiters
  const contentSegments = splitByDelimiters(normalizedContent, SENTENCE_END_DELIMITERS);
  const normalizedPinyin = normalizePinyinSpacing(pinyin);
  const pinyinSegments = splitByDelimiters(normalizedPinyin, SENTENCE_END_DELIMITERS);

  // Must have the same number of segments for a basic structural match
  return contentSegments.length === pinyinSegments.length && contentSegments.length > 0;
}

// ==================== Backward Compatibility ====================

/**
 * Legacy interface for backward compatibility.
 * Returns the old format without per-character matches.
 */
export function alignPinyinWithContentLegacy(
  content: string,
  pinyin: string
): Array<{ chinese: string; pinyin: string }> {
  const aligned = alignPinyinWithContent(content, pinyin);
  return aligned.map(a => ({ chinese: a.chinese, pinyin: a.pinyin }));
}