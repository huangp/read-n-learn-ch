/**
 * Pagination utility for splitting article content into pages
 * Calculates page size dynamically based on screen dimensions and font settings
 */

export interface PaginationResult {
  pages: string[];
  totalPages: number;
  needsPagination: boolean;
}

export interface PaginationConfig {
  screenWidth: number;
  screenHeight: number;
  fontSize: number;
  lineHeight: number;
  headerHeight: number;
  controlsHeight: number;
  padding: number;
}

// Default font settings (should match your app's defaults)
const DEFAULT_FONT_SIZE = 18;
const DEFAULT_LINE_HEIGHT = 32;

// Heights for UI elements (approximate)
const HEADER_HEIGHT = 150; // Title + meta info
const CONTROLS_HEIGHT = 80; // Pagination controls
const PADDING = 40; // Total vertical padding (20 top + 20 bottom)

// Threshold: Only paginate if content exceeds 2 screen heights
const PAGINATION_THRESHOLD_SCREENS = 2;

/**
 * Calculate how many characters fit on one page
 * Accounts for Chinese characters being roughly square (width ≈ height)
 */
function calculateCharsPerPage(config: PaginationConfig): number {
  const {
    screenWidth,
    screenHeight,
    fontSize,
    lineHeight,
    headerHeight,
    controlsHeight,
    padding,
  } = config;

  // Available height for content
  const availableHeight = screenHeight - headerHeight - controlsHeight - padding;

  // Calculate lines that fit
  const linesPerPage = Math.floor(availableHeight / lineHeight);

  // Calculate characters per line (Chinese chars are ~0.6em wide, but let's be conservative)
  // Using 0.8 to account for some spacing
  const charsPerLine = Math.floor(screenWidth / (fontSize * 0.8));

  return linesPerPage * charsPerLine;
}

/**
 * Check if content needs pagination based on screen height threshold
 */
function needsPagination(content: string, config: PaginationConfig): boolean {
  const charsPerPage = calculateCharsPerPage(config);
  const thresholdChars = charsPerPage * PAGINATION_THRESHOLD_SCREENS;
  return content.length > thresholdChars;
}

/**
 * Split content into pages, trying to respect sentence boundaries
 */
function splitIntoPages(content: string, charsPerPage: number): string[] {
  const pages: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= charsPerPage) {
      // Last page
      pages.push(remaining.trim());
      break;
    }

    // Find a good breaking point
    let breakPoint = charsPerPage;

    // Try to find sentence ending within last 20% of page
    const searchStart = Math.floor(charsPerPage * 0.8);
    const searchEnd = charsPerPage;
    const slice = remaining.slice(searchStart, searchEnd);

    // Look for sentence endings: 。！？
    const sentenceEndings = ['。', '！', '？'];
    let foundBreak = -1;

    for (const ending of sentenceEndings) {
      const lastIndex = slice.lastIndexOf(ending);
      if (lastIndex !== -1) {
        foundBreak = Math.max(foundBreak, searchStart + lastIndex + 1);
      }
    }

    // If found a sentence ending, use it; otherwise use charsPerPage
    if (foundBreak !== -1 && foundBreak > searchStart) {
      breakPoint = foundBreak;
    }

    // Extract page content
    const pageContent = remaining.slice(0, breakPoint).trim();
    if (pageContent) {
      pages.push(pageContent);
    }

    // Move to next page
    remaining = remaining.slice(breakPoint).trim();
  }

  return pages;
}

/**
 * Main pagination function
 * Returns paginated content or single page if not needed
 */
export function paginateContent(
  content: string,
  screenWidth: number,
  screenHeight: number,
  fontSize: number = DEFAULT_FONT_SIZE,
  lineHeight: number = DEFAULT_LINE_HEIGHT
): PaginationResult {
  const config: PaginationConfig = {
    screenWidth,
    screenHeight,
    fontSize,
    lineHeight,
    headerHeight: HEADER_HEIGHT,
    controlsHeight: CONTROLS_HEIGHT,
    padding: PADDING,
  };

  // Check if pagination is needed
  const shouldPaginate = needsPagination(content, config);

  if (!shouldPaginate) {
    return {
      pages: [content],
      totalPages: 1,
      needsPagination: false,
    };
  }

  // Calculate page size
  const charsPerPage = calculateCharsPerPage(config);

  // Split into pages
  const pages = splitIntoPages(content, charsPerPage);

  return {
    pages,
    totalPages: pages.length,
    needsPagination: true,
  };
}

/**
 * Get current page configuration for re-calculation
 * Use this when screen size or font size changes
 */
export function recalculatePages(
  content: string,
  config: PaginationConfig
): PaginationResult {
  const shouldPaginate = needsPagination(content, config);

  if (!shouldPaginate) {
    return {
      pages: [content],
      totalPages: 1,
      needsPagination: false,
    };
  }

  const charsPerPage = calculateCharsPerPage(config);
  const pages = splitIntoPages(content, charsPerPage);

  return {
    pages,
    totalPages: pages.length,
    needsPagination: true,
  };
}

/**
 * Get the page index that contains a specific character position
 * Used to restore reading position from stored charPosition
 * 
 * @param charPosition - Character index in the content
 * @param pages - Array of page content strings
 * @returns Page index (0-based) containing the character position
 */
export function getPageForPosition(charPosition: number, pages: string[]): number {
  if (!pages || pages.length === 0) return 0;
  if (charPosition <= 0) return 0;
  
  let accumulatedChars = 0;
  
  for (let i = 0; i < pages.length; i++) {
    const pageLength = pages[i].length;
    if (charPosition < accumulatedChars + pageLength) {
      return i;
    }
    accumulatedChars += pageLength;
  }
  
  // If position is beyond all pages, return last page
  return pages.length - 1;
}

/**
 * Get the starting character position of a specific page
 * Used to save reading progress when user is on a specific page
 * 
 * @param pageIndex - Page index (0-based)
 * @param pages - Array of page content strings
 * @returns Character position at the start of the page
 */
export function getPositionForPage(pageIndex: number, pages: string[]): number {
  if (!pages || pages.length === 0) return 0;
  if (pageIndex <= 0) return 0;
  if (pageIndex >= pages.length) {
    // Return start of last page
    let position = 0;
    for (let i = 0; i < pages.length - 1; i++) {
      position += pages[i].length;
    }
    return position;
  }
  
  let position = 0;
  for (let i = 0; i < pageIndex; i++) {
    position += pages[i].length;
  }
  return position;
}

/**
 * Round a character position to the nearest word boundary
 * Ensures reading progress aligns with word boundaries for better UX
 * 
 * @param position - Character position to round
 * @param content - Full content string
 * @returns Position rounded to start of nearest word
 */
export function roundToWordBoundary(position: number, content: string): number {
  if (!content || position <= 0) return 0;
  if (position >= content.length) return content.length;
  
  // Find the start of the current word by looking backwards
  // A word boundary is typically after punctuation or whitespace
  let roundedPosition = position;
  
  // Look backwards to find word boundary
  while (roundedPosition > 0) {
    const prevChar = content[roundedPosition - 1];
    // Check if previous character is a word boundary (punctuation or whitespace)
    if (/[\s。！？，；：""''（）【】]/.test(prevChar)) {
      break;
    }
    roundedPosition--;
  }
  
  // If we didn't find a boundary going backwards, look forwards
  if (roundedPosition === position && position < content.length) {
    while (roundedPosition < content.length) {
      const char = content[roundedPosition];
      if (/[\s。！？，；：""''（）【】]/.test(char)) {
        break;
      }
      roundedPosition++;
    }
  }
  
  return roundedPosition;
}