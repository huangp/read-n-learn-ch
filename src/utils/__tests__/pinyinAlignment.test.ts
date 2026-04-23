import { alignPinyinWithContent, groupSegmentsBySentences } from '../pinyinAlignment';
import type { SegmentedWord } from '../../types';

describe('alignPinyinWithContent', () => {
  it('should align simple sentence with period', () => {
    const content = '你好，世界。';
    const pinyin = 'nǐ hǎo ， shì jiè 。';

    const result = alignPinyinWithContent(content, pinyin);

    expect(result.length).toBeGreaterThanOrEqual(1);
    // First segment should contain the Chinese text
    expect(result[0].chinese).toContain('你好');
    // Should have pinyin
    expect(result[0].pinyin.length).toBeGreaterThan(0);
  });

  it('should handle multiple sentences', () => {
    const content = '今天天气很好。我们去公园吧！';
    const pinyin = 'jīn tiān tiān qì hěn hǎo 。 wǒ men qù gōng yuán ba ！';

    const result = alignPinyinWithContent(content, pinyin);

    expect(result.length).toBeGreaterThanOrEqual(2);
    // Combined Chinese should match original (minus some punctuation handling)
    const combinedChinese = result.map(r => r.chinese).join('');
    expect(combinedChinese).toContain('今天天气很好');
    expect(combinedChinese).toContain('我们去公园吧');
  });

  it('should handle mixed punctuation', () => {
    const content = '你好吗？我很好，谢谢！';
    const pinyin = 'nǐ hǎo ma ？ wǒ hěn hǎo ， xiè xiè ！';

    const result = alignPinyinWithContent(content, pinyin);

    expect(result.length).toBeGreaterThanOrEqual(2);
    const combinedChinese = result.map(r => r.chinese).join('');
    expect(combinedChinese).toContain('你好吗');
    expect(combinedChinese).toContain('我很好');
  });

  it('should handle content without punctuation', () => {
    const content = '你好世界';
    const pinyin = 'nǐ hǎo shì jiè';

    const result = alignPinyinWithContent(content, pinyin);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].chinese).toContain('你好世界');
  });

  it('should handle empty input', () => {
    expect(alignPinyinWithContent('', 'nǐ hǎo')).toEqual([]);
    expect(alignPinyinWithContent('你好', '')).toEqual([]);
    expect(alignPinyinWithContent('', '')).toEqual([]);
  });

  it('should handle semicolon and colon', () => {
    const content = '第一：开始；第二：继续。';
    const pinyin = 'dì yī ： kāi shǐ ； dì èr ： jì xù 。';

    const result = alignPinyinWithContent(content, pinyin);

    expect(result.length).toBeGreaterThanOrEqual(1);
    const combinedChinese = result.map(r => r.chinese).join('');
    expect(combinedChinese).toContain('第一');
    expect(combinedChinese).toContain('开始');
  });

  it('should handle English punctuation from server', () => {
    const content = '你好，世界。';
    const pinyin = 'nǐ hǎo, shì jiè.';

    const result = alignPinyinWithContent(content, pinyin);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].chinese).toContain('你好');
  });

  it('should handle mixed English and Chinese punctuation', () => {
    const content = '你好吗？我很好，谢谢！';
    const pinyin = 'nǐ hǎo ma? wǒ hěn hǎo, xiè xiè!';

    const result = alignPinyinWithContent(content, pinyin);

    expect(result.length).toBeGreaterThanOrEqual(2);
    const combinedChinese = result.map(r => r.chinese).join('');
    expect(combinedChinese).toContain('你好吗');
    expect(combinedChinese).toContain('我很好');
  });

  it('should handle English punctuation with spaces', () => {
    const content = '今天天气很好。我们去公园吧！';
    const pinyin = 'jīn tiān tiān qì hěn hǎo . wǒ men qù gōng yuán ba !';

    const result = alignPinyinWithContent(content, pinyin);

    expect(result.length).toBeGreaterThanOrEqual(2);
    const combinedChinese = result.map(r => r.chinese).join('');
    expect(combinedChinese).toContain('今天天气很好');
    expect(combinedChinese).toContain('我们去公园吧');
  });

  it('should provide per-character matches when alignment succeeds', () => {
    const content = '我去银行';
    const pinyin = 'wǒ qù yínháng';

    const result = alignPinyinWithContent(content, pinyin);

    // Find a segment with Chinese characters
    const chineseSegment = result.find(r => /\p{Script=Han}/u.test(r.chinese));
    expect(chineseSegment).toBeDefined();
    
    if (chineseSegment && chineseSegment.matches) {
      expect(chineseSegment.matches.length).toBeGreaterThan(0);
      // Each match should have char and pinyin
      expect(chineseSegment.matches[0]).toHaveProperty('char');
      expect(chineseSegment.matches[0]).toHaveProperty('pinyin');
    }
  });

  it('should handle fallback when alignment fails', () => {
    // Use mismatched content and pinyin to trigger fallback
    const content = '你好世界';
    const pinyin = 'completely different pinyin that does not match';

    const result = alignPinyinWithContent(content, pinyin);

    expect(result.length).toBeGreaterThanOrEqual(1);
    // When alignment fails, matches should be null
    expect(result[0].matches).toBeNull();
    // But we should still have the pinyin string
    expect(result[0].pinyin).toBeDefined();
  });
});

describe('groupSegmentsBySentences with server article data', () => {
  const articleData = {
    article: "我有一个朋友，他很喜欢小动物。他家里有一只猫，这只猫很可爱。我的朋友叫它“小爱”。\n\n小爱不喜欢冷，所以冬天的时候，朋友会给它开空调。朋友说，保护小动物很重要。他常常和我说，我们要爱护动物，不只是爱护猫，也要爱护其他的动物。\n\n我们上次去北京玩，北京有很多公园。公园里有很多小动物。朋友说，我们要保护它们，不要打扰它们。他说，保护动物，也是保护我们自己。\n\n他很喜欢看关于动物的书。他告诉我，动物是我们的朋友。他常常给我打电话，和我聊动物的事情。他说，我们应该多学习怎么保护动物。爱护动物，保护环境，这是我们每个人都应该做的事情。",
    pinyin: "wǒ yǒu yīgè péngyǒu, tā hěn xǐhuān xiǎo dòngwù. tā jiālǐ yǒu yī zhī māo, zhè zhī māo hěn kě'ài. wǒ de péngyǒu jiào tā “xiǎo ài”.\n\nxiǎo ài bù xǐhuān lěng, suǒyǐ dōngtiān de shíhòu, péngyǒu huì gěi tā kāi kōngtiáo. péngyǒu shuō, bǎohù xiǎo dòngwù hěn zhòngyào. tā chángcháng hé wǒ shuō, wǒmen yào àihù dòngwù, bù zhǐshì àihù māo, yě yào àihù qí tā de dòngwù.\n\nwǒmen shàng cì qù běijīng wán, běijīng yǒu hěnduō gōngyuán. gōngyuán lǐ yǒu hěnduō xiǎo dòngwù. péngyǒu shuō, wǒmen yào bǎohù tāmen, bùyào dǎrǎo tāmen. tā shuō, bǎohù dòngwù, yěshì bǎohù wǒmen zìjǐ.\n\ntā hěn xǐhuān kàn guānyú dòngwù de shū. tā gàosù wǒ, dòngwù shì wǒmen de péngyǒu. tā chángcháng gěi wǒ dǎ diànhuà, hé wǒ liáo dòngwù de shìqíng. tā shuō, wǒmen yīnggāi duō xuéxí zěnme bǎohù dòngwù. àihù dòngwù, bǎohù huánjìng, zhè shì wǒmen měi gèrén dōu yīnggāi zuò de shìqíng.",
    segments: ["我","有","一个","朋友","，","他","很","喜欢","小","动物","。","他","家里","有","一只","猫","，","这","只","猫","很","可爱","。我的","朋友","叫","它","“","小","爱","”","。","小","爱","不","喜欢","冷","，","所以","冬天","的时候","，","朋友","会","给","它","开","空调","。朋友","说","，","保护","小","动物","很","重要","。他","常常","和","我","说","，","我们","要","爱护","动物","，","不","只是","爱护","猫","，","也","要","爱护","其他","的","动物","。","我们","上次","去","北京","玩","，","北京","有","很多","公园","。公园","里","有","很多","小","动物","。朋友","说","，","我们","要","保护","它们","，","不要","打扰","它们","。他","说","，","保护","动物","，","也是","保护","我们","自己","。","他","很","喜欢","看","关于","动物","的","书","。他","告诉","我","，","动物","是","我们","的","朋友","。他","常常","给","我","打电话","，","和","我","聊","动物","的","事情","。他","说","，","我们","应该","多","学习","怎么","保护","动物","。爱护","动物","，","保护","环境","，","这","是","我们","每个","人","都","应该","做","的","事情","。"]
  };

  it('should align all sentences with server article data', () => {
    const aligned = alignPinyinWithContent(articleData.article, articleData.pinyin);
    const segments = articleData.segments.map((text, index) => ({ id: String(index), text, type: 'chinese' as const }));
    const blocks = groupSegmentsBySentences(segments, aligned);

    // Verify total segments are preserved
    const totalSegmentChars = segments.reduce((sum, s) => sum + s.text.length, 0);
    const totalBlockChars = blocks.reduce((sum, b) => sum + b.segments.reduce((s, seg) => s + seg.text.length, 0), 0);
    expect(totalBlockChars).toBe(totalSegmentChars);

    // Verify each block matches its Chinese sentence (ignoring paragraph breaks in comparison)
    for (let i = 0; i < aligned.length; i++) {
      const expectedChinese = aligned[i].chinese.trim();
      const actualChinese = blocks[i].segments
        .filter(s => !/^\s+$/.test(s.text))
        .map(s => s.text)
        .join('');
      expect(actualChinese).toBe(expectedChinese);
    }

    // No sentence should start with a sentence-ending punctuation
    for (let i = 0; i < blocks.length; i++) {
      const firstNonWhitespace = blocks[i].segments.find(s => !/^\s+$/.test(s.text));
      if (firstNonWhitespace) {
        expect(firstNonWhitespace.text.charAt(0)).not.toMatch(/[。！？，；：、]/);
      }
    }
  });

  it('should align sentences with newline-containing segments (case 2)', () => {
    const articleData2 = {
      article: "我们爱动物，也爱学习。我喜欢看动物。它们很可爱。我的家有一个小猫，它叫小花。小花很喜欢玩。我常常和小花一起玩。我们爱小花。\n\n今年我学习了一个新的成语：保护动物。保护动物是件好事。我们应该好好保护动物。我们也要保护我们的家和我们住的屋子。我们爱我们的家。\n\n我有一个朋友，他叫大卫。大卫很喜欢小动物。他常常去动物园看动物。他喜欢大象，也喜欢小猫。大卫的家很漂亮。他家有一个空调。夏天的时候，家里很凉快。大卫常常给我打电话，我们一起说说话。他喜欢学习，也喜欢看书。我们都是好朋友。",
      pinyin: "Wǒmen ài dòngwù, yě ài xuéxí. Wǒ xǐhuān kàn dòngwù. Tāmen hěn kě'ài. Wǒ de jiā yǒu yīgè xiǎo māo, tā jiào Xiǎohuā. Xiǎohuā hěn xǐhuān wán. Wǒ chángcháng hé Xiǎohuā yīqǐ wán. Wǒmen ài Xiǎohuā.\n\nJīnnián wǒ xuéxí le yīgè xīn de chéngyǔ: Bǎohù dòngwù. Bǎohù dòngwù shì jiàn hǎoshì. Wǒmen yīnggāi hǎohǎo bǎohù dòngwù. Wǒmen yě yào bǎohù wǒmen de jiā hé wǒmen zhù de wūzi. Wǒmen ài wǒmen de jiā.\n\nWǒ yǒu yīgè péngyǒu, tā jiào Dàwèi. Dàwèi hěn xǐhuān xiǎo dòngwù. Tā chángcháng qù dòngwùyuán kàn dòngwù. Tā xǐhuān dà xiàng, yě xǐhuān xiǎo māo. Dàwèi de jiā hěn piàoliang. Tā jiā yǒu yīgè kōngtiáo. Xiàtiān de shíhou, jiālǐ hěn liángkuai. Dàwèi chángcháng gěi wǒ dǎ diànhuà, wǒmen yīqǐ shuō shuōhuà. Tā xǐhuān xuéxí, yě xǐhuān kàn shū. Wǒmen dōu shì hǎo péngyǒu.",
      segments: ["我们","爱","动物","，","也","爱","学习","。我","喜欢","看","动物","。它们","很","可爱","。我的","家","有","一个","小","猫","，","它","叫","小花","。小花","很","喜欢","玩","。我","常常","和","小花","一起","玩","。我们","爱","小花","。","\n\n","今年","我","学习","了","一个","新","的","成语","：","保护","动物","。保护","动物","是","件","好事","。我们","应该","好好","保护","动物","。我们","也","要","保护","我们","的","家","和","我们","住","的","屋子","。我们","爱","我们","的","家","。","\n\n","我","有","一个","朋友","，","他","叫","大卫","。大卫","很","喜欢","小","动物","。他","常常","去","动物园","看","动物","。他","喜欢","大象","，","也","喜欢","小","猫","。大卫","的","家","很","漂亮","。他","家","有","一个","空调","。夏天","的","时候","，","家里","很","凉快","。大卫","常常","给","我","打","电话","，","我们","一起","说","说话","。他","喜欢","学习","，","也","喜欢","看","书","。我们","都","是","好","朋友","。"]
    };

    const aligned = alignPinyinWithContent(articleData2.article, articleData2.pinyin);
    const segments = articleData2.segments.map((text, index) => ({ id: String(index), text, type: 'chinese' as const }));
    const blocks = groupSegmentsBySentences(segments, aligned);

    // Each block's combined Chinese must exactly match the aligned Chinese sentence
    // (ignoring whitespace-only segments like "\n\n" that serve as paragraph breaks)
    for (let i = 0; i < aligned.length; i++) {
      const expectedChinese = aligned[i].chinese.trim();
      const actualChinese = blocks[i].segments
        .filter(s => !/^\s+$/.test(s.text))
        .map(s => s.text)
        .join('');
      expect(actualChinese).toBe(expectedChinese);
    }

    // Critical: no sentence should START with a sentence-ending punctuation
    // (this was the reported bug: punctuation appearing at start of next sentence)
    for (let i = 0; i < blocks.length; i++) {
      const firstNonWhitespace = blocks[i].segments.find(s => !/^\s+$/.test(s.text));
      if (firstNonWhitespace) {
        expect(firstNonWhitespace.text.charAt(0)).not.toMatch(/[。！？，；：、]/);
      }
    }
  });

  it('should handle paragraph breaks correctly', () => {
    const content = '第一段。\n\n第二段。';
    const pinyin = 'dì yī duàn 。 dì èr duàn 。';

    const result = alignPinyinWithContent(content, pinyin);
    
    // Should have segments for both paragraphs
    const combinedChinese = result.map(r => r.chinese).join('');
    expect(combinedChinese).toContain('第一段');
    expect(combinedChinese).toContain('第二段');
  });

  it('should provide matches for per-character pinyin alignment', () => {
    const content = '我爱学习。';
    const pinyin = 'wǒ ài xuéxí 。';
    const segments: SegmentedWord[] = [
      { id: '1', text: '我', type: 'chinese' },
      { id: '2', text: '爱', type: 'chinese' },
      { id: '3', text: '学习', type: 'chinese' },
      { id: '4', text: '。', type: 'other' },
    ];

    const aligned = alignPinyinWithContent(content, pinyin);
    const blocks = groupSegmentsBySentences(segments, aligned);

    // Should have at least one block with matches
    const blockWithMatches = blocks.find(b => b.matches && b.matches.length > 0);
    
    if (blockWithMatches && blockWithMatches.matches) {
      // Each match should have char and pinyin
      expect(blockWithMatches.matches[0]).toHaveProperty('char');
      expect(blockWithMatches.matches[0]).toHaveProperty('pinyin');
      
      // Verify the characters match
      const chars = blockWithMatches.matches.map(m => m.char).join('');
      expect(chars).toContain('我');
      expect(chars).toContain('爱');
    }
  });
});
