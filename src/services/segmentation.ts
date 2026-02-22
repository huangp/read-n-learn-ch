/**
 * Chinese text segmentation service using segmentit.
 *
 * segmentit is a pure-JS Chinese word segmenter with a built-in dictionary,
 * HMM model, and name recognition. It runs entirely locally — no cloud
 * services needed.
 */

// @ts-ignore — segmentit has no type declarations
import { useDefault, Segment } from 'segmentit';

export interface SegmentedWord {
  id: string;
  text: string;
  start: number;
  end: number;
  isInDictionary: boolean;
}

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
 *
 * @param content - The Chinese text content to segment
 * @returns Array of segmented words with positions
 */
export async function segmentArticle(content: string): Promise<SegmentedWord[]> {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const seg = getSegmenter();

  // doSegment returns an array of { w: string, p: number }
  // where w = word, p = POS tag
  const rawSegments: Array<{ w: string; p: number }> = seg.doSegment(content, {
    simple: false,       // return full objects (not just strings)
    stripPunctuation: true, // remove punctuation tokens
  });

  const segments: SegmentedWord[] = [];
  let searchFrom = 0;

  for (let i = 0; i < rawSegments.length; i++) {
    const word = rawSegments[i].w;

    // Only keep segments that contain Chinese characters
    if (!hasChinese(word)) {
      // Still advance searchFrom past this word so positions stay correct
      const idx = content.indexOf(word, searchFrom);
      if (idx !== -1) {
        searchFrom = idx + word.length;
      }
      continue;
    }

    const start = content.indexOf(word, searchFrom);
    if (start === -1) continue; // safety check
    const end = start + word.length;

    segments.push({
      id: `seg-${segments.length}`,
      text: word,
      start,
      end,
      isInDictionary: false, // will be set by dictionary service later
    });

    searchFrom = end;
  }

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
  return segments.filter(
    (seg) => seg.start >= pageStart && seg.end <= pageEnd
  );
}

/**
 * Re-segment content
 */
export async function resegmentArticle(content: string): Promise<SegmentedWord[]> {
  return segmentArticle(content);
}