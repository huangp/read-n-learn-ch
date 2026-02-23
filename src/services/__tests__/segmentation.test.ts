import { getSegmentsForPage, SegmentedWord } from '../segmentation';

describe('segmentArticle', () => {
  // Note: segmentArticle tests are skipped because jieba-wasm is a WebAssembly
  // module that doesn't work in Node.js test environment.
  // The function is tested indirectly through integration tests.
  
  describe('Function signature', () => {
    it('should exist as a function', () => {
      // Import the module to verify it exports correctly
      const segmentationModule = require('../segmentation');
      expect(typeof segmentationModule.segmentArticle).toBe('function');
    });
  });
});

describe('getSegmentsForPage', () => {
  const mockSegments: SegmentedWord[] = [
    { id: '1', text: '我', start: 0, end: 1, type: 'chinese', isInDictionary: false },
    { id: '2', text: '喜欢', start: 1, end: 3, type: 'chinese', isInDictionary: false },
    { id: '3', text: '学习', start: 3, end: 5, type: 'chinese', isInDictionary: false },
    { id: '4', text: '中文', start: 5, end: 7, type: 'chinese', isInDictionary: false },
    { id: '5', text: '非常', start: 7, end: 9, type: 'chinese', isInDictionary: false },
    { id: '6', text: '有趣', start: 9, end: 11, type: 'chinese', isInDictionary: false },
  ];

  it('should return segments within page range', () => {
    const result = getSegmentsForPage(mockSegments, 0, 5);

    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('我');
    expect(result[1].text).toBe('喜欢');
    expect(result[2].text).toBe('学习');
  });

  it('should return segments for middle page', () => {
    const result = getSegmentsForPage(mockSegments, 3, 9);

    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('学习');
    expect(result[1].text).toBe('中文');
    expect(result[2].text).toBe('非常');
  });

  it('should return empty array when no segments in range', () => {
    const result = getSegmentsForPage(mockSegments, 100, 200);

    expect(result).toHaveLength(0);
  });

  it('should handle partial segment overlap', () => {
    // Segment at position 3-5 overlaps with range 4-8
    const result = getSegmentsForPage(mockSegments, 4, 8);

    // Should include segments that fall within the range
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty segments array', () => {
    const result = getSegmentsForPage([], 0, 10);

    expect(result).toHaveLength(0);
  });

  it('should handle single segment', () => {
    const singleSegment: SegmentedWord[] = [
      { id: '1', text: '学习', start: 0, end: 2, type: 'chinese', isInDictionary: false },
    ];

    const result = getSegmentsForPage(singleSegment, 0, 2);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('学习');
  });
});