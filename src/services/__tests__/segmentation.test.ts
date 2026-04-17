import { segmentArticle, SegmentedWord } from '../segmentation';

// Mock segmentit
jest.mock('segmentit', () => ({
  useDefault: jest.fn(() => ({
    doSegment: jest.fn((text: string) => {
      // Simple mock segmentation - split by spaces and newlines
      const parts = text.split(/(\s+)/);
      return parts
        .filter(p => p.length > 0)
        .map(w => ({ w, p: 0 }));
    }),
  })),
  Segment: jest.fn(),
}));

describe('segmentArticle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should exist as a function', () => {
    const segmentationModule = require('../segmentation');
    expect(typeof segmentationModule.segmentArticle).toBe('function');
  });

  it('should return empty array for empty content', async () => {
    const result = await segmentArticle('');
    expect(result).toEqual([]);
  });

  it('should return empty array for whitespace-only content', async () => {
    const result = await segmentArticle('   \n\t  ');
    expect(result).toEqual([]);
  });

  it('should create segments without start/end positions', async () => {
    const content = 'Hello world';
    const result = await segmentArticle(content);

    expect(result.length).toBeGreaterThan(0);
    result.forEach((segment: SegmentedWord) => {
      expect(segment).toHaveProperty('id');
      expect(segment).toHaveProperty('text');
      expect(segment).toHaveProperty('type');
      expect(segment).not.toHaveProperty('start');
      expect(segment).not.toHaveProperty('end');
      expect(['chinese', 'other']).toContain(segment.type);
    });
  });

  it('should preserve all content in segments', async () => {
    const content = 'Hello world test';
    const result = await segmentArticle(content);

    // Reconstruct content from segments
    const reconstructed = result.map(s => s.text).join('');
    expect(reconstructed).toBe(content);
  });

  it('should handle Chinese text', async () => {
    const content = '我喜欢学习中文';
    const result = await segmentArticle(content);

    expect(result.length).toBeGreaterThan(0);
    result.forEach((segment: SegmentedWord) => {
      expect(segment).not.toHaveProperty('start');
      expect(segment).not.toHaveProperty('end');
    });
  });

  it('should handle mixed Chinese and English', async () => {
    const content = 'Hello 你好 world 世界';
    const result = await segmentArticle(content);

    const reconstructed = result.map(s => s.text).join('');
    expect(reconstructed).toBe(content);
  });

  it('should handle newlines', async () => {
    const content = 'Line 1\n\nLine 2';
    const result = await segmentArticle(content);

    // Should have paragraph break segments
    const hasNewlines = result.some(s => s.text.includes('\n'));
    expect(hasNewlines).toBe(true);
  });

  it('should handle single newlines', async () => {
    const content = 'Line 1\nLine 2';
    const result = await segmentArticle(content);

    const hasNewline = result.some(s => s.text === '\n');
    expect(hasNewline).toBe(true);
  });

  it('should handle paragraph breaks', async () => {
    const content = 'Paragraph 1\n\nParagraph 2';
    const result = await segmentArticle(content);

    const hasParagraphBreak = result.some(s => s.text === '\n\n');
    expect(hasParagraphBreak).toBe(true);
  });

  it('should assign unique IDs to segments', async () => {
    const content = 'Hello world test';
    const result = await segmentArticle(content);

    const ids = result.map(s => s.id);
    const uniqueIds = [...new Set(ids)];
    expect(uniqueIds.length).toBe(ids.length);
  });

  it('should classify Chinese characters correctly', async () => {
    const content = '中文 english';
    const result = await segmentArticle(content);

    const chineseSegments = result.filter(s => s.type === 'chinese');
    const otherSegments = result.filter(s => s.type === 'other');

    expect(chineseSegments.length).toBeGreaterThan(0);
    expect(otherSegments.length).toBeGreaterThan(0);
  });

  it('should handle punctuation', async () => {
    const content = 'Hello, world! How are you?';
    const result = await segmentArticle(content);

    const reconstructed = result.map(s => s.text).join('');
    expect(reconstructed).toBe(content);
  });

  it('should handle numbers', async () => {
    const content = '2024年 100个人';
    const result = await segmentArticle(content);

    const reconstructed = result.map(s => s.text).join('');
    expect(reconstructed).toBe(content);
  });

  it('should handle tabs and spaces', async () => {
    const content = 'Word1\tWord2  Word3';
    const result = await segmentArticle(content);

    const reconstructed = result.map(s => s.text).join('');
    expect(reconstructed).toBe(content);
  });

  it('should handle very long content', async () => {
    const content = 'Word '.repeat(1000);
    const result = await segmentArticle(content);

    expect(result.length).toBeGreaterThan(0);
    const reconstructed = result.map(s => s.text).join('');
    expect(reconstructed).toBe(content);
  });

  it('should handle special characters', async () => {
    const content = '!@#$%^&*()_+-=[]{}|;\':",./<>?';
    const result = await segmentArticle(content);

    expect(result.length).toBeGreaterThan(0);
  });
});

describe('resegmentArticle', () => {
  it('should exist as a function', () => {
    const segmentationModule = require('../segmentation');
    expect(typeof segmentationModule.resegmentArticle).toBe('function');
  });

  it('should return segments for content', async () => {
    const content = 'Test content for resegmentation';
    const result = await segmentArticle(content);

    expect(result.length).toBeGreaterThan(0);
    result.forEach((segment: SegmentedWord) => {
      expect(segment).not.toHaveProperty('start');
      expect(segment).not.toHaveProperty('end');
    });
  });
});
