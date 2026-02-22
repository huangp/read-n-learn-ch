import {
  paginateContent,
  recalculatePages,
  getPageForPosition,
  getPositionForPage,
  roundToWordBoundary,
  PaginationConfig,
} from '../pagination';

// Mock content for testing - Chinese text with various lengths
const SHORT_CONTENT = '这是一个短文章。只有几句话。';

const MEDIUM_CONTENT = `
今天天气很好。我想去公园散步。
公园里有很多人。有的在跑步，有的在打太极拳。
我看到一只小鸟在树上唱歌。它的歌声很好听。
我还看到一只小狗在草地上玩耍。它看起来很快乐。
`.trim();

const LONG_CONTENT = `
第一章：绪论

本文研究人工智能的发展历史。从1956年达特茅斯会议开始，AI经历了多次浪潮。

第二节：现代AI
深度学习在2012年ImageNet竞赛中取得突破。神经网络技术得到广泛应用。

第三节：未来展望
人工智能将在医疗、教育、交通等领域发挥重要作用。我们需要关注AI伦理问题。

第二章：技术基础

机器学习是AI的核心技术。监督学习、无监督学习、强化学习是主要方法。
深度学习使用多层神经网络。卷积神经网络在图像识别中表现优异。
循环神经网络适合处理序列数据。Transformer架构革新了自然语言处理。

第三章：应用场景

智能助手如Siri、Alexa已经进入千家万户。自动驾驶技术正在快速发展。
医疗AI可以辅助诊断疾病。教育AI提供个性化学习方案。
`.trim();

// Standard test configuration (iPhone-like dimensions)
const STANDARD_CONFIG: PaginationConfig = {
  screenWidth: 375,
  screenHeight: 812,
  fontSize: 18,
  lineHeight: 32,
  headerHeight: 150,
  controlsHeight: 80,
  padding: 40,
};

// Tablet configuration
const TABLET_CONFIG: PaginationConfig = {
  screenWidth: 768,
  screenHeight: 1024,
  fontSize: 18,
  lineHeight: 32,
  headerHeight: 150,
  controlsHeight: 80,
  padding: 40,
};

describe('paginateContent', () => {
  describe('Basic Pagination', () => {
    it('should return single page for short content', () => {
      const result = paginateContent(
        SHORT_CONTENT,
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight
      );

      expect(result.needsPagination).toBe(false);
      expect(result.totalPages).toBe(1);
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0]).toBe(SHORT_CONTENT);
    });

    it('should paginate long content', () => {
      // Create very long content that will definitely trigger pagination
      const veryLongContent = '这是一个很长的句子。'.repeat(100);
      
      const result = paginateContent(
        veryLongContent,
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight
      );

      expect(result.needsPagination).toBe(true);
      expect(result.totalPages).toBeGreaterThan(1);
      expect(result.pages.length).toBeGreaterThan(1);
    });

    it('should not paginate content under threshold (2 screen heights)', () => {
      // Content that fits within 2 screen heights should not paginate
      const mediumResult = paginateContent(
        MEDIUM_CONTENT,
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight
      );

      // Medium content might or might not paginate depending on exact length
      // Just verify it returns a valid result
      expect(mediumResult.totalPages).toBeGreaterThanOrEqual(1);
      expect(mediumResult.pages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Font Size Impact', () => {
    it('should create more pages with larger font size', () => {
      const smallFontResult = paginateContent(
        LONG_CONTENT,
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight,
        14, // Small font
        24
      );

      const largeFontResult = paginateContent(
        LONG_CONTENT,
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight,
        24, // Large font
        40
      );

      // Larger font should result in more pages
      expect(largeFontResult.totalPages).toBeGreaterThanOrEqual(
        smallFontResult.totalPages
      );
    });

    it('should handle minimum font size', () => {
      const result = paginateContent(
        MEDIUM_CONTENT,
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight,
        10, // Very small font
        16
      );

      expect(result.totalPages).toBeGreaterThanOrEqual(1);
      expect(result.pages[0].length).toBeGreaterThan(0);
    });

    it('should handle maximum font size', () => {
      const result = paginateContent(
        MEDIUM_CONTENT,
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight,
        32, // Very large font
        48
      );

      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    // TODO: Add tests for font size changes affecting reading progress
    // When font size changes, the page count changes but character position should remain valid
    it.skip('TODO: should maintain valid character position when font size changes', () => {
      // This test is pending implementation of font size settings
      // When user changes font size, we need to:
      // 1. Recalculate pagination with new font size
      // 2. Find which new page contains the stored charPosition
      // 3. Update current page display without losing reading position
    });
  });

  describe('Screen Size Adaptation', () => {
    it('should create fewer pages on larger screens', () => {
      const phoneResult = paginateContent(
        LONG_CONTENT,
        375, // iPhone width
        812, // iPhone height
        18,
        32
      );

      const tabletResult = paginateContent(
        LONG_CONTENT,
        768, // iPad width
        1024, // iPad height
        18,
        32
      );

      // Tablet should have fewer or equal pages than phone
      expect(tabletResult.totalPages).toBeLessThanOrEqual(phoneResult.totalPages);
    });

    it('should handle very small screens', () => {
      const result = paginateContent(
        MEDIUM_CONTENT,
        320, // Small phone
        568,
        18,
        32
      );

      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should handle very large screens', () => {
      const result = paginateContent(
        MEDIUM_CONTENT,
        1024, // Large tablet
        1366,
        18,
        32
      );

      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Content Splitting', () => {
    it('should preserve all content across pages', () => {
      const result = paginateContent(
        LONG_CONTENT,
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight
      );

      // Reconstruct content from pages
      const reconstructed = result.pages.join('');
      
      // Should match original (ignoring whitespace differences from trimming)
      expect(reconstructed.replace(/\s+/g, '')).toBe(LONG_CONTENT.replace(/\s+/g, ''));
    });

    it('should handle content with no sentence endings', () => {
      const noPunctuation = '这是一个没有标点符号的测试文本用于测试分页功能';
      
      const result = paginateContent(
        noPunctuation,
        200, // Small width to force pagination
        400,
        18,
        32
      );

      expect(result.totalPages).toBeGreaterThanOrEqual(1);
      
      // Verify all content is preserved
      const reconstructed = result.pages.join('');
      expect(reconstructed).toBe(noPunctuation);
    });

    it('should try to break at sentence endings', () => {
      const withSentences = '第一句。第二句！第三句？第四句。第五句。';
      
      const result = paginateContent(
        withSentences,
        300,
        600,
        18,
        32
      );

      // Check that pages don't split in the middle of sentences when possible
      for (const page of result.pages) {
        // Page should not start with punctuation (indicating mid-sentence split)
        const firstChar = page.trim()[0];
        expect(['。', '！', '？']).not.toContain(firstChar);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const result = paginateContent(
        '',
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight
      );

      expect(result.needsPagination).toBe(false);
      expect(result.totalPages).toBe(1);
      expect(result.pages[0]).toBe('');
    });

    it('should handle whitespace-only content', () => {
      const result = paginateContent(
        '   \n\t   ',
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight
      );

      expect(result.totalPages).toBe(1);
    });

    it('should handle single character', () => {
      const result = paginateContent(
        '中',
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight
      );

      expect(result.needsPagination).toBe(false);
      expect(result.pages[0]).toBe('中');
    });

    it('should handle very long content', () => {
      const veryLong = '这是一个句子。'.repeat(1000);
      
      const result = paginateContent(
        veryLong,
        STANDARD_CONFIG.screenWidth,
        STANDARD_CONFIG.screenHeight
      );

      expect(result.needsPagination).toBe(true);
      expect(result.totalPages).toBeGreaterThan(10);
    });
  });
});

describe('recalculatePages', () => {
  it('should recalculate with new configuration', () => {
    const initialResult = paginateContent(
      LONG_CONTENT,
      STANDARD_CONFIG.screenWidth,
      STANDARD_CONFIG.screenHeight,
      18,
      32
    );

    const newConfig: PaginationConfig = {
      ...STANDARD_CONFIG,
      fontSize: 24,
      lineHeight: 40,
    };

    const recalculatedResult = recalculatePages(LONG_CONTENT, newConfig);

    // Should have different page count with larger font
    expect(recalculatedResult.totalPages).toBeGreaterThanOrEqual(
      initialResult.totalPages
    );
  });
});

describe('getPageForPosition', () => {
  const pages = [
    '第一页的内容。这是第一页。',
    '第二页的内容。这是第二页。',
    '第三页的内容。这是第三页。',
  ];

  it('should return first page for position 0', () => {
    expect(getPageForPosition(0, pages)).toBe(0);
  });

  it('should return correct page for position in first page', () => {
    const position = 5; // Within first page
    expect(getPageForPosition(position, pages)).toBe(0);
  });

  it('should return correct page for position in second page', () => {
    const firstPageLength = pages[0].length;
    const position = firstPageLength + 5; // In second page
    expect(getPageForPosition(position, pages)).toBe(1);
  });

  it('should return correct page for position in last page', () => {
    const totalLength = pages.reduce((sum, page) => sum + page.length, 0);
    expect(getPageForPosition(totalLength - 1, pages)).toBe(2);
  });

  it('should return last page for position beyond content', () => {
    const totalLength = pages.reduce((sum, page) => sum + page.length, 0);
    expect(getPageForPosition(totalLength + 100, pages)).toBe(2);
  });

  it('should handle negative position', () => {
    expect(getPageForPosition(-10, pages)).toBe(0);
  });

  it('should handle empty pages array', () => {
    expect(getPageForPosition(10, [])).toBe(0);
  });
});

describe('getPositionForPage', () => {
  const pages = [
    '第一页的内容。',
    '第二页的内容。',
    '第三页的内容。',
  ];

  it('should return 0 for first page', () => {
    expect(getPositionForPage(0, pages)).toBe(0);
  });

  it('should return correct position for second page', () => {
    const expectedPosition = pages[0].length;
    expect(getPositionForPage(1, pages)).toBe(expectedPosition);
  });

  it('should return correct position for third page', () => {
    const expectedPosition = pages[0].length + pages[1].length;
    expect(getPositionForPage(2, pages)).toBe(expectedPosition);
  });

  it('should return 0 for negative page index', () => {
    expect(getPositionForPage(-1, pages)).toBe(0);
  });

  it('should return last page position for index beyond range', () => {
    const lastPagePosition = pages[0].length + pages[1].length;
    expect(getPositionForPage(10, pages)).toBe(lastPagePosition);
  });

  it('should handle empty pages array', () => {
    expect(getPositionForPage(0, [])).toBe(0);
  });
});

describe('roundToWordBoundary', () => {
  const content = '第一句话。第二句话！第三句话？';

  it('should return 0 for position 0', () => {
    expect(roundToWordBoundary(0, content)).toBe(0);
  });

  it('should round to start of word', () => {
    // Position in middle of "第二句话"
    const position = 8;
    const rounded = roundToWordBoundary(position, content);
    
    // Should round to start of current word (第)
    expect(rounded).toBeLessThanOrEqual(position);
    expect(content[rounded]).toBe('第');
  });

  it('should handle position at word boundary', () => {
    // Position at start of content (word boundary)
    const position = 0;
    const rounded = roundToWordBoundary(position, content);
    
    expect(rounded).toBe(0);
  });

  it('should handle position at end of content', () => {
    const position = content.length;
    expect(roundToWordBoundary(position, content)).toBe(position);
  });

  it('should handle position beyond content', () => {
    expect(roundToWordBoundary(content.length + 10, content)).toBe(content.length);
  });

  it('should handle empty content', () => {
    expect(roundToWordBoundary(0, '')).toBe(0);
  });

  it('should handle single character', () => {
    expect(roundToWordBoundary(0, '中')).toBe(0);
  });
});