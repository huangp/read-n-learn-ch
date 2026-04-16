/**
 * Chinese text segmentation service using segmentit.
 *
 * segmentit is a pure-JS Chinese word segmenter with a built-in dictionary,
 * HMM model, and name recognition. It runs entirely locally — no cloud
 * services needed.
 */

// @ts-ignore — segmentit has no type declarations
import { useDefault, Segment } from 'segmentit';
import DebugService from './debug';
import { SegmentedWord } from '../types';

// Re-export for convenience
export type { SegmentedWord } from '../types';

// Initialise once and reuse
let segmentInstance: any = null;

function getSegmenter() {
  if (!segmentInstance) {
    segmentInstance = useDefault(new Segment());
  }
  return segmentInstance;
}

/**
 * Check if a string contains at least one Chinese character
 */
function hasChinese(str: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(str);
}

/**
 * Segment Chinese text into words.
 * Called when saving / importing an article.
 * Preserves all content including punctuation, numbers, and newlines.
 *
 * Strategy: split content by newline boundaries first, segment each chunk
 * with segmentit, then stitch together with explicit newline segments.
 *
 * @param content - The Chinese text content to segment
 * @returns Array of segmented words with positions
 */
export async function segmentArticle(content: string): Promise<SegmentedWord[]> {
  DebugService.log('SEGMENTATION', 'Starting segmentation', { contentLength: content?.length });

  if (!content || content.trim().length === 0) {
    DebugService.log('SEGMENTATION', 'Empty content, returning empty array');
    return [];
  }

  const seg = getSegmenter();
  const segments: SegmentedWord[] = [];
  let segId = 0;

  // Split content into alternating text-chunks and newline-sequences
  // e.g. "Hello\n\nWorld\n" → ["Hello", "\n\n", "World", "\n"]
  const parts = content.split(/(\r?\n+)/);

  let offset = 0; // tracks position in original content

  for (const part of parts) {
    if (part.length === 0) {
      continue;
    }

    // If this part is purely newlines, emit newline/paragraph segments
    if (/^\r?\n+$/.test(part)) {
      const nlCount = (part.match(/\n/g) || []).length;
      if (nlCount >= 2) {
        // Paragraph break
        segments.push({
          id: `seg-${segId++}`,
          text: '\n\n',
          start: offset,
          end: offset + part.length,
          type: 'other',
        });
      } else {
        // Single line break
        segments.push({
          id: `seg-${segId++}`,
          text: '\n',
          start: offset,
          end: offset + part.length,
          type: 'other',
        });
      }
      offset += part.length;
      continue;
    }

    // Non-newline text chunk → run through segmentit
    const rawSegments: Array<{ w: string; p: number }> = seg.doSegment(part, {
      simple: false,
      stripPunctuation: false,
    });

    let searchFrom = 0; // position within `part`

    for (const raw of rawSegments) {
      const word = raw.w;
      // Skip pure whitespace tokens that aren't newlines
      if (/^\s+$/.test(word) && !/\n/.test(word)) {
        // Still find its position to keep searchFrom accurate
        const idx = part.indexOf(word, searchFrom);
        if (idx !== -1) searchFrom = idx + word.length;
        // Emit as a space segment so text flows correctly
        if (idx !== -1) {
          segments.push({
            id: `seg-${segId++}`,
            text: word,
            start: offset + idx,
            end: offset + idx + word.length,
            type: 'other',
          });
        }
        continue;
      }

      const idx = part.indexOf(word, searchFrom);
      if (idx === -1) continue;

      // Check for any gap between last segment and this one (e.g. spaces segmentit skipped)
      if (idx > searchFrom) {
        const gap = part.substring(searchFrom, idx);
        if (gap.trim().length > 0 || gap.length > 0) {
          segments.push({
            id: `seg-${segId++}`,
            text: gap,
            start: offset + searchFrom,
            end: offset + idx,
            type: 'other',
          });
        }
      }

      const type: 'chinese' | 'other' = hasChinese(word) ? 'chinese' : 'other';

      segments.push({
        id: `seg-${segId++}`,
        text: word,
        start: offset + idx,
        end: offset + idx + word.length,
        type,
      });

      searchFrom = idx + word.length;
    }

    offset += part.length;
  }

  DebugService.log('SEGMENTATION', `Created ${segments.length} segments`, {
    firstFew: segments.slice(0, 3),
    lastFew: segments.slice(-3),
  });

  return segments;
}

/**
 * Get segments for a specific page of content
 */
export function getSegmentsForPage(
  segments: SegmentedWord[],
  pageStart: number,
  pageEnd: number
): SegmentedWord[] {
  DebugService.log('SEGMENTATION', `Filtering segments for page range ${pageStart}-${pageEnd}`, {
    totalSegments: segments?.length,
    pageStart,
    pageEnd
  });
  
  const filtered = segments.filter(
    (seg) => seg.start >= pageStart && seg.end <= pageEnd
  );
  
  DebugService.log('SEGMENTATION', `Filtered to ${filtered.length} segments for page`, {
    filtered: filtered.map(s => ({ text: s.text, start: s.start, end: s.end }))
  });
  
  return filtered;
}

/**
 * Re-segment content
 */
export async function resegmentArticle(content: string): Promise<SegmentedWord[]> {
  return segmentArticle(content);
}