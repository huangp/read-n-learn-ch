/**
 * Pure utility function to extract Chinese content while preserving structure
 * This function has no external dependencies and can be tested independently
 * 
 * Keeps:
 * - Chinese characters (CJK Unified Ideographs)
 * - Chinese punctuation
 * - English punctuation
 * - Numbers (Arabic and Chinese)
 * - Whitespace (preserving paragraph structure)
 * 
 * @param text - The input text to process
 * @returns Filtered text containing only Chinese content with preserved structure
 */
export function extractChineseContent(text: string): string {
  if (!text) return '';

  // Define patterns for characters to keep
  const patterns = [
    // Chinese characters (CJK Unified Ideographs)
    '\u4e00-\u9fa5',
    // Chinese punctuation: 。，、？！：；「」『』（）《》…·
    '\u3002\uff0c\u3001\uff1f\uff01\uff1a\uff1b\u300c\u300d\u300e\u300f\uff08\uff09\u300a\u300b\u2026\u00b7',
    // English punctuation (common ones)
    '.,!?;:\'"\\-—',
    // Numbers (Arabic and Chinese numerals)
    '0-9\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u4e07\u4ebf',
    // Whitespace (preserve line breaks and spaces)
    '\\s',
  ];

  // Create regex that matches any character we want to keep
  const keepPattern = new RegExp(`[${patterns.join('')}]`, 'g');

  // Extract all matching characters
  const matches = text.match(keepPattern);

  if (matches && matches.length > 0) {
    let result = matches.join('');

    // Clean up excessive whitespace while preserving paragraph structure
    result = result
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Normalize spaces/tabs
      .replace(/ \n/g, '\n') // Remove trailing spaces before newlines
      .replace(/\n /g, '\n') // Remove leading spaces after newlines
      .trim();

    return result;
  }

  return '';
}