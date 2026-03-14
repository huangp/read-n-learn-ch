// CommonJS version for Node.js mock server

const mockExamples = [
  {
    chinese: '你好，很高兴认识你。',
    pinyin: 'Nǐ hǎo, hěn gāoxìng rènshi nǐ.',
    english: 'Hello, nice to meet you.',
  },
  {
    chinese: '你今天好吗？',
    pinyin: 'Nǐ jīntiān hǎo ma?',
    english: 'How are you today?',
  },
];

const mockVocabularyData = {
  '你好': {
    vocabulary: '你好',
    pinyin: 'nǐ hǎo',
    definition: 'Hello; Hi',
    strokeOrder: '1. 你: 撇, 竖, 撇, 横, 竖钩, 撇, 点\n2. 好: 撇点, 撇, 横, 横撇, 竖钩, 横',
    examples: mockExamples,
    cached: false,
  },
  '中国': {
    vocabulary: '中国',
    pinyin: 'zhōng guó',
    definition: 'China',
    strokeOrder: '1. 中: 竖, 横折, 横, 竖\n2. 国: 竖, 横折, 横, 横, 竖, 横, 点, 横',
    examples: [
      {
        chinese: '中国是一个大国。',
        pinyin: 'Zhōngguó shì yí gè dà guó.',
        english: 'China is a large country.',
      },
    ],
    cached: false,
  },
  '学习': {
    vocabulary: '学习',
    pinyin: 'xué xí',
    definition: 'To study; To learn',
    strokeOrder: '1. 学: 点, 点, 撇, 点, 横撇, 横撇, 竖, 横, 横\n2. 习: 横折钩, 点, 提',
    examples: [
      {
        chinese: '我在学习中文。',
        pinyin: 'Wǒ zài xuéxí zhōngwén.',
        english: 'I am learning Chinese.',
      },
    ],
    cached: false,
  },
  '爱': {
    vocabulary: '爱',
    pinyin: 'ài',
    definition: 'Love; To love',
    strokeOrder: '撇, 点, 点, 撇, 点, 横撇, 横, 撇, 横撇, 捺',
    examples: [
      {
        chinese: '我爱你。',
        pinyin: 'Wǒ ài nǐ.',
        english: 'I love you.',
      },
    ],
    cached: false,
  },
  '今天': {
    vocabulary: '今天',
    pinyin: 'jīn tiān',
    definition: 'Today',
    strokeOrder: '1. 今: 撇, 捺, 点, 横撇\n2. 天: 横, 横, 撇, 捺',
    examples: [
      {
        chinese: '今天天气很好。',
        pinyin: 'Jīntiān tiānqì hěn hǎo.',
        english: 'The weather is good today.',
      },
    ],
    cached: false,
  },
};

const getMockVocabulary = (word) => {
  const lookup = mockVocabularyData[word];
  if (lookup) {
    return { ...lookup, cached: true };
  }
  
  return {
    vocabulary: word,
    pinyin: 'unknown',
    definition: `Definition for "${word}" not found in mock data`,
    examples: [],
    cached: false,
  };
};

const addMockVocabulary = (word, data) => {
  mockVocabularyData[word] = data;
};

module.exports = {
  getMockVocabulary,
  addMockVocabulary,
};
