import { alignPinyinWithContent, groupSegmentsBySentences, canAlignPinyin } from '../pinyinAlignment';
import type { SegmentedWord } from '../../types';

describe('canAlignPinyin', () => {
  it('should return true when content and pinyin have matching sentence count', () => {
    const content = '你好，世界。今天天气很好！';
    const pinyin = 'nǐ hǎo ， shì jiè 。 jīn tiān tiān qì hěn hǎo ！';

    expect(canAlignPinyin(content, pinyin)).toBe(true);
  });

  it('should return false when sentence counts mismatch', () => {
    const content = '你好。世界。';
    const pinyin = 'nǐ hǎo 。';

    expect(canAlignPinyin(content, pinyin)).toBe(false);
  });

  it('should return false when pinyin is missing', () => {
    const content = '你好。';
    expect(canAlignPinyin(content, '')).toBe(false);
  });

  it('should return false when content is missing', () => {
    const pinyin = 'nǐ hǎo 。';
    expect(canAlignPinyin('', pinyin)).toBe(false);
  });

  it('should handle mixed English/Chinese punctuation', () => {
    const content = '塞翁失马，焉知非福?';
    const pinyin = 'Sàiwēng shī mǎ, yān zhī fēi fú?';

    expect(canAlignPinyin(content, pinyin)).toBe(true);
  });
});

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

  it('should handle Saiweng article with mixed punctuation and quotes', () => {
    const articleData = {
      article: '塞翁失马，焉知非福? 这个故事很有意思。有一个老人，他养了一匹马。有一天，这匹马跑丢了。邻居都说："真不走运啊！"老人却说："这不一定是坏事。"\n\n过了几个月，那匹马自己回来了，还带回来一匹好马。邻居们都来祝贺老人。老人又说："这不一定是好事。"\n\n老人的儿子很喜欢骑这匹新马。有一天，他骑马的时候，从马上摔了下来，腿受了伤。邻居们都来安慰老人。老人说："这不一定是坏事。"\n\n没过多久，国家打仗了，很多年轻人都去当兵。老人的儿子因为腿受伤了，就不用去当兵了。很多人都在战争中死了，但是老人的儿子活了下来。所以，"塞翁失马，焉知非福"这个成语告诉我们，一件事情的坏和好，有时候是会改变的。不要太容易觉得一件事是好是坏。',
      pinyin: 'Sàiwēng shī mǎ, yān zhī fēi fú? Zhège gùshì hěn yǒu yìsi. Yǒu yīgè lǎorén, tā yǎngle yī pǐ mǎ. Yǒu yī tiān, zhè pǐ mǎ pǎo diūle. Línjū dōu shuō: "Zhēn bù zǒuyùn a!" Lǎorén què shuō: "Zhè bù yīdìng shì huàishì."\n\nGuòle jǐ gè yuè, nà pǐ mǎ zìjǐ huíláile, hái dài huílái yī pǐ hǎo mǎ. Línjūmen dōu lái zhùhè lǎorén. Lǎorén yòu shuō: "Zhè bù yīdìng shì hǎoshì."\n\nLǎorén de érzi hěn xǐhuān qí zhè pǐ xīn mǎ. Yǒu yī tiān, tā qí mǎ de shíhòu, cóng mǎ shàng shuāi xiàlái, tuǐ shòule shāng. Línjūmen dōu lái ānwèi lǎorén. Lǎorén shuō: "Zhè bù yīdìng shì huàishì."\n\nMéi guò duōjiǔ, guójiā dǎzhàngle, hěn duō niánqīngrén dōu qù dāngbīng. Lǎorén de érzi yīnwèi tuǐ shòushāngle, jiù bù yòng qù dāngbīngle. Hěn duō rén dōu zài zhànzhēng zhōng sǐle, dànshì lǎorén de érzi huóle xiàlái. Suǒyǐ, "Sàiwēng shī mǎ, yān zhī fēi fú" zhège chéngyǔ gàosù wǒmen, yī jiàn shìqíng de huài hé hǎo, yǒushíhòu shì huì gǎibiàn de. Bùyào tài róngyì juédé yī jiàn shì shì hǎo shì huài.',
      segments: [
        '塞翁失马', '，',   '焉知非福', '?',    '这个',   '故事',
        '很',       '有',   '意思',     '。有', '一个',   '老人',
        '，',       '他',   '养',       '了',   '一',     '匹',
        '马',       '。有', '一天',     '，',   '这',     '匹',
        '马',       '跑',   '丢',       '了',   '。邻居', '都',
        '说',       '：',   '"',        '真',   '不',     '走运',
        '啊',       '！',   '"',        '老人', '却',     '说',
        '：',       '"',    '这',       '不',   '一定',   '是',
        '坏事',     '。',   '"',        '\n\n', '过',     '了',
        '几个',     '月',   '，',       '那',   '匹',     '马',
        '自己',     '回来', '了',       '，',   '还',     '带回来',
        '一',       '匹',   '好',       '马',   '。邻居', '们',
        '都',       '来',   '祝贺',     '老人', '。老人', '又',
        '说',       '：',   '"',        '这',   '不',     '一定',
        '是',       '好事', '。',       '"',    '\n\n',   '老人',
        '的',       '儿子', '很',       '喜欢', '骑',     '这',
        '匹',       '新',   '马',       '。有',
        '一天',     '，',   '他',       '骑马', '的',     '时候',
        '，',       '从',   '马上',     '摔',   '了',     '下来',
        '，',       '腿',   '受了',     '伤',   '。',     '邻居',
        '们',       '都',   '来',       '安慰', '老人',   '。',
        '老人',     '说',   '：',       '"',    '这',     '不',
        '一定',     '是',   '坏事',     '。',   '"',      '\n\n',
        '没',       '过',   '多久',     '，',   '国家',   '打仗',
        '了',       '，',   '很多',     '年轻', '人',     '都',
        '去',       '当兵', '。',       '老人', '的',     '儿子',
        '因为',     '腿',   '受伤',     '了',   '，',     '就',
        '不',       '用',   '去',       '当兵', '了',     '。',
        '很多',     '人',   '都',       '在',   '战争',   '中',
        '死',       '了',   '，',       '但是', '老人',   '的',
        '儿子',     '活',   '了',       '下来', '。',     '所以',
        '，',       '"',    '塞翁失马', '，',   '焉知非福', '"',
        '这个',     '成语', '告诉',     '我们', '，',     '一件',
        '事情',     '的',   '坏',       '和',   '好',     '，',
        '有时候',   '是',   '会',       '改变', '的',     '。',
        '不要',     '太',   '容易',     '觉得', '一件',   '事',
        '是',       '好',   '是',       '坏',   '。'
      ]
    };

    const aligned = alignPinyinWithContent(articleData.article, articleData.pinyin);
    const segments = articleData.segments.map((text, index) => ({ id: String(index), text, type: 'chinese' as const }));
    const blocks = groupSegmentsBySentences(segments, aligned);

    // Should have multiple blocks
    expect(blocks.length).toBeGreaterThan(1);

    // Most blocks should have pinyin (either as matches or as string)
    const blocksWithPinyin = blocks.filter(b => b.pinyin && b.pinyin.length > 0);
    expect(blocksWithPinyin.length).toBeGreaterThan(blocks.length * 0.8);

    // At least some blocks should have per-character matches
    const blocksWithMatches = blocks.filter(b => b.matches && b.matches.length > 0);
    expect(blocksWithMatches.length).toBeGreaterThan(0);

    // Verify total segments are preserved
    const totalSegmentChars = segments.reduce((sum, s) => sum + s.text.length, 0);
    const totalBlockChars = blocks.reduce((sum, b) => sum + b.segments.reduce((s, seg) => s + seg.text.length, 0), 0);
    expect(totalBlockChars).toBe(totalSegmentChars);

    // No sentence should start with sentence-ending punctuation
    for (let i = 0; i < blocks.length; i++) {
      const firstNonWhitespace = blocks[i].segments.find(s => !/^\s+$/.test(s.text));
      if (firstNonWhitespace) {
        expect(firstNonWhitespace.text.charAt(0)).not.toMatch(/[。！？，；：、]/);
      }
    }
  });
});
