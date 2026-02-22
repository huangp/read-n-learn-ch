import { extractChineseContent } from '../../utils/textProcessing';

describe('extractChineseContent', () => {
  describe('Empty/Null Input', () => {
    it('should return empty string for empty input', () => {
      expect(extractChineseContent('')).toBe('');
    });

    it('should return empty string for null input', () => {
      expect(extractChineseContent(null as any)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(extractChineseContent(undefined as any)).toBe('');
    });

    it('should return empty string for whitespace-only input', () => {
      expect(extractChineseContent('   \t\n  ')).toBe('');
    });
  });

  describe('Chinese Character Extraction', () => {
    it('should keep pure Chinese text', () => {
      const input = '这是一个测试文本';
      expect(extractChineseContent(input)).toBe('这是一个测试文本');
    });

    it('should extract only Chinese characters from mixed content', () => {
      const input = 'Hello 世界 World';
      expect(extractChineseContent(input)).toBe('世界');
    });

    it('should handle Chinese text with punctuation', () => {
      const input = '今天天气很好。我们出去散步吧！';
      expect(extractChineseContent(input)).toBe('今天天气很好。我们出去散步吧！');
    });
  });

  describe('Chinese Punctuation Preservation', () => {
    it('should preserve full stop 。', () => {
      const input = '这是第一句。这是第二句';
      expect(extractChineseContent(input)).toBe('这是第一句。这是第二句');
    });

    it('should preserve comma ，', () => {
      const input = '苹果，香蕉，橙子';
      expect(extractChineseContent(input)).toBe('苹果，香蕉，橙子');
    });

    it('should preserve question mark ？', () => {
      const input = '你今天好吗？';
      expect(extractChineseContent(input)).toBe('你今天好吗？');
    });

    it('should preserve exclamation ！', () => {
      const input = '真是太棒了！';
      expect(extractChineseContent(input)).toBe('真是太棒了！');
    });

    it('should preserve colon and semicolon ：；', () => {
      const input = '注意：时间；地点';
      expect(extractChineseContent(input)).toBe('注意：时间；地点');
    });

    it('should preserve quotation marks 「」『』', () => {
      const input = '他说：「你好」';
      expect(extractChineseContent(input)).toBe('他说：「你好」');
    });

    it('should preserve parentheses （）', () => {
      const input = '（注释）正文';
      expect(extractChineseContent(input)).toBe('（注释）正文');
    });

    it('should preserve book title marks 《》', () => {
      const input = '《红楼梦》是经典';
      expect(extractChineseContent(input)).toBe('《红楼梦》是经典');
    });

    it('should preserve ellipsis ……', () => {
      const input = '他想了想……然后说';
      expect(extractChineseContent(input)).toBe('他想了想……然后说');
    });

    it('should preserve middle dot ·', () => {
      const input = '诺·贝尔';
      expect(extractChineseContent(input)).toBe('诺·贝尔');
    });
  });

  describe('English Punctuation Preservation', () => {
    it('should preserve period .', () => {
      const input = 'Hello.世界';
      expect(extractChineseContent(input)).toBe('.世界');
    });

    it('should preserve comma ,', () => {
      const input = 'Hello,世界';
      expect(extractChineseContent(input)).toBe(',世界');
    });

    it('should preserve question mark ?', () => {
      const input = 'What?什么';
      expect(extractChineseContent(input)).toBe('?什么');
    });

    it('should preserve exclamation !', () => {
      const input = 'Wow!哇';
      expect(extractChineseContent(input)).toBe('!哇');
    });

    it('should preserve semicolon and colon ;:', () => {
      const input = 'Note:注意；';
      expect(extractChineseContent(input)).toBe(':注意；');
    });

    it('should preserve quotes', () => {
      const input = '"中文"';
      expect(extractChineseContent(input)).toBe('"中文"');
    });

    it('should preserve hyphens and dashes -—', () => {
      const input = '二零二零-二零二一';
      expect(extractChineseContent(input)).toBe('二零二零-二零二一');
    });
  });

  describe('Number Handling', () => {
    it('should preserve Arabic numerals', () => {
      const input = '2024年';
      expect(extractChineseContent(input)).toBe('2024年');
    });

    it('should preserve Chinese numerals', () => {
      const input = '二零二四年';
      expect(extractChineseContent(input)).toBe('二零二四年');
    });

    it('should preserve mixed numerals', () => {
      const input = '第1名，第二名';
      expect(extractChineseContent(input)).toBe('第1名，第二名');
    });

    it('should preserve large Chinese numbers', () => {
      const input = '一百万零五千三百二十一';
      expect(extractChineseContent(input)).toBe('一百万零五千三百二十一');
    });
  });

  describe('Whitespace and Structure Preservation', () => {
    it('should preserve single line breaks', () => {
      const input = '第一行\n第二行';
      expect(extractChineseContent(input)).toBe('第一行\n第二行');
    });

    it('should preserve paragraph breaks (double newlines)', () => {
      const input = '第一段\n\n第二段';
      expect(extractChineseContent(input)).toBe('第一段\n\n第二段');
    });

    it('should limit excessive newlines to maximum 2', () => {
      const input = '第一段\n\n\n\n第二段';
      expect(extractChineseContent(input)).toBe('第一段\n\n第二段');
    });

    it('should normalize Windows line endings', () => {
      const input = '第一行\r\n第二行';
      expect(extractChineseContent(input)).toBe('第一行\n第二行');
    });

    it('should normalize old Mac line endings', () => {
      const input = '第一行\r第二行';
      expect(extractChineseContent(input)).toBe('第一行\n第二行');
    });

    it('should normalize multiple spaces', () => {
      const input = '中文    文本';
      expect(extractChineseContent(input)).toBe('中文 文本');
    });

    it('should normalize tabs to spaces', () => {
      const input = '中文\t文本';
      expect(extractChineseContent(input)).toBe('中文 文本');
    });

    it('should remove trailing spaces before newlines', () => {
      const input = '中文   \n文本';
      expect(extractChineseContent(input)).toBe('中文\n文本');
    });

    it('should remove leading spaces after newlines', () => {
      const input = '中文\n   文本';
      expect(extractChineseContent(input)).toBe('中文\n文本');
    });

    it('should trim leading and trailing whitespace', () => {
      const input = '  中文文本  ';
      expect(extractChineseContent(input)).toBe('中文文本');
    });
  });

  describe('Special Character Removal', () => {
    it('should remove emojis', () => {
      const input = '你好😊世界';
      expect(extractChineseContent(input)).toBe('你好世界');
    });

    it('should remove special symbols', () => {
      const input = '价格@100元';
      expect(extractChineseContent(input)).toBe('价格100元');
    });

    it('should remove mathematical symbols', () => {
      const input = '2+2=4';
      expect(extractChineseContent(input)).toBe('224');
    });

    it('should remove currency symbols', () => {
      const input = '价格$100';
      expect(extractChineseContent(input)).toBe('价格100');
    });

    it('should remove non-Chinese letters', () => {
      const input = 'Hello世界World';
      expect(extractChineseContent(input)).toBe('世界');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle PDF extracted text with garbage', () => {
      const input = 'BT /F1 12 Tf 100 700 Td (你好世界) Tj ET /Length 123 >>';
      expect(extractChineseContent(input)).toBe('1 12 100 700 你好世界 123');
    });

    it('should handle mixed content document', () => {
      const input = 'Title: 标题\n\nContent: 这是内容。\n\nFooter @2024';
      expect(extractChineseContent(input)).toBe(': 标题\n\n: 这是内容。\n\n2024');
    });

    it('should handle multi-paragraph text', () => {
      const input = '第一段。\n\n第二段，更多内容。\n\n第三段！';
      expect(extractChineseContent(input)).toBe('第一段。\n\n第二段，更多内容。\n\n第三段！');
    });

    it('should handle text with mixed punctuation', () => {
      const input = '他说："你好！"（微笑）';
      expect(extractChineseContent(input)).toBe('他说："你好！"（微笑）');
    });

    it('should handle text with numbers and dates', () => {
      const input = '2024年1月15日，星期一。';
      expect(extractChineseContent(input)).toBe('2024年1月15日，星期一。');
    });

    it('should handle text with book titles and quotes', () => {
      const input = '《论语》说：「学而时习之」';
      expect(extractChineseContent(input)).toBe('《论语》说：「学而时习之」');
    });

    it('should handle complex real-world example', () => {
      const input = `第一章：绪论

      本文研究人工智能的发展历史。从1956年达特茅斯会议开始，AI经历了多次浪潮。

      第二节：现代AI
      深度学习在2012年ImageNet竞赛中取得突破……`;
      
      const expected = `第一章：绪论

本文研究人工智能的发展历史。从1956年达特茅斯会议开始，经历了多次浪潮。

第二节：现代
深度学习在2012年竞赛中取得突破……`;
      
      expect(extractChineseContent(input)).toBe(expected);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', () => {
      const input = '中'.repeat(10000);
      expect(extractChineseContent(input)).toBe(input);
    });

    it('should handle text with only punctuation', () => {
      const input = '。。。，，，！！！';
      expect(extractChineseContent(input)).toBe('。。。，，，！！！');
    });

    it('should handle text with only numbers', () => {
      const input = '12345';
      expect(extractChineseContent(input)).toBe('12345');
    });

    it('should handle text with no Chinese characters', () => {
      const input = 'Hello World! 123';
      expect(extractChineseContent(input)).toBe('! 123');
    });

    it('should handle single character', () => {
      expect(extractChineseContent('中')).toBe('中');
    });

    it('should handle consecutive punctuation', () => {
      const input = '哇！！！真的吗？？？';
      expect(extractChineseContent(input)).toBe('哇！！！真的吗？？？');
    });
  });
});