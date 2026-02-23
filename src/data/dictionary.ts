/**
 * Dictionary data types and interfaces
 * Using a simplified in-memory dictionary for HSK 1-6 words
 * This is a lightweight implementation that can be extended to use SQLite later
 */

export interface DictionaryEntry {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  definitions: string[];
  pos: string; // Part of speech
  hskLevel?: number;
  examples: ExampleSentence[];
}

export interface ExampleSentence {
  chinese: string;
  english: string;
}

export interface CharacterBreakdown {
  char: string;
  pinyin: string;
  literalMeaning: string;
  contextualMeaning: string;
}

export interface WordLookupResult {
  word: string;
  pinyin: string;
  definitions: string[];
  pos: string;
  hskLevel?: number;
  examples: ExampleSentence[];
  characters: CharacterBreakdown[];
}

// Simplified HSK 1-6 dictionary subset
// In production, this would be loaded from a SQLite database
export const dictionaryData: DictionaryEntry[] = [
  // Common words from HSK 1-6
  {
    id: '1',
    simplified: '银行',
    pinyin: 'yín háng',
    definitions: ['bank', 'banking house'],
    pos: 'noun',
    hskLevel: 3,
    examples: [
      { chinese: '我去银行取钱。', english: 'I\'m going to the bank to withdraw money.' },
      { chinese: '银行几点开门？', english: 'What time does the bank open?' },
      { chinese: '这家银行服务很好。', english: 'This bank has good service.' },
    ],
  },
  {
    id: '2',
    simplified: '北京',
    pinyin: 'běi jīng',
    definitions: ['Beijing', 'Peking'],
    pos: 'proper noun',
    hskLevel: 1,
    examples: [
      { chinese: '我在北京工作。', english: 'I work in Beijing.' },
      { chinese: '北京是中国的首都。', english: 'Beijing is the capital of China.' },
    ],
  },
  {
    id: '3',
    simplified: '学习',
    pinyin: 'xué xí',
    definitions: ['to learn', 'to study'],
    pos: 'verb',
    hskLevel: 1,
    examples: [
      { chinese: '我在学习中文。', english: 'I\'m learning Chinese.' },
      { chinese: '他学习很努力。', english: 'He studies very hard.' },
      { chinese: '我们一起学习吧。', english: 'Let\'s study together.' },
    ],
  },
  {
    id: '4',
    simplified: '中国',
    pinyin: 'zhōng guó',
    definitions: ['China'],
    pos: 'proper noun',
    hskLevel: 1,
    examples: [
      { chinese: '我来自中国。', english: 'I come from China.' },
      { chinese: '中国很大。', english: 'China is very big.' },
    ],
  },
  {
    id: '5',
    simplified: '今天',
    pinyin: 'jīn tiān',
    definitions: ['today'],
    pos: 'noun',
    hskLevel: 1,
    examples: [
      { chinese: '今天天气很好。', english: 'The weather is good today.' },
      { chinese: '今天是星期一。', english: 'Today is Monday.' },
    ],
  },
  {
    id: '6',
    simplified: '明天',
    pinyin: 'míng tiān',
    definitions: ['tomorrow'],
    pos: 'noun',
    hskLevel: 1,
    examples: [
      { chinese: '明天见！', english: 'See you tomorrow!' },
      { chinese: '明天我要去上海。', english: 'I\'m going to Shanghai tomorrow.' },
    ],
  },
  {
    id: '7',
    simplified: '昨天',
    pinyin: 'zuó tiān',
    definitions: ['yesterday'],
    pos: 'noun',
    hskLevel: 1,
    examples: [
      { chinese: '昨天我很忙。', english: 'I was very busy yesterday.' },
      { chinese: '昨天是星期天。', english: 'Yesterday was Sunday.' },
    ],
  },
  {
    id: '8',
    simplified: '喜欢',
    pinyin: 'xǐ huan',
    definitions: ['to like', 'to enjoy'],
    pos: 'verb',
    hskLevel: 1,
    examples: [
      { chinese: '我喜欢吃中国菜。', english: 'I like eating Chinese food.' },
      { chinese: '你喜欢什么颜色？', english: 'What color do you like?' },
    ],
  },
  {
    id: '9',
    simplified: '朋友',
    pinyin: 'péng you',
    definitions: ['friend'],
    pos: 'noun',
    hskLevel: 1,
    examples: [
      { chinese: '他是我的朋友。', english: 'He is my friend.' },
      { chinese: '我有很多朋友。', english: 'I have many friends.' },
    ],
  },
  {
    id: '10',
    simplified: '工作',
    pinyin: 'gōng zuò',
    definitions: ['work', 'job'],
    pos: 'noun/verb',
    hskLevel: 2,
    examples: [
      { chinese: '我在一家公司工作。', english: 'I work at a company.' },
      { chinese: '你做什么工作？', english: 'What work do you do?' },
    ],
  },
  {
    id: '11',
    simplified: '吃饭',
    pinyin: 'chī fàn',
    definitions: ['to eat', 'to have a meal'],
    pos: 'verb',
    hskLevel: 1,
    examples: [
      { chinese: '我们一起吃饭吧。', english: 'Let\'s eat together.' },
      { chinese: '你吃饭了吗？', english: 'Have you eaten?' },
    ],
  },
  {
    id: '12',
    simplified: '说话',
    pinyin: 'shuō huà',
    definitions: ['to speak', 'to talk'],
    pos: 'verb',
    hskLevel: 1,
    examples: [
      { chinese: '请说话大声一点。', english: 'Please speak louder.' },
      { chinese: '我们在说话。', english: 'We are talking.' },
    ],
  },
  {
    id: '13',
    simplified: '看书',
    pinyin: 'kàn shū',
    definitions: ['to read', 'to read a book'],
    pos: 'verb',
    hskLevel: 1,
    examples: [
      { chinese: '我喜欢看书。', english: 'I like reading books.' },
      { chinese: '他在看书。', english: 'He is reading.' },
    ],
  },
  {
    id: '14',
    simplified: '写字',
    pinyin: 'xiě zì',
    definitions: ['to write characters'],
    pos: 'verb',
    hskLevel: 1,
    examples: [
      { chinese: '我在写字。', english: 'I am writing.' },
      { chinese: '请写字清楚一点。', english: 'Please write more clearly.' },
    ],
  },
  {
    id: '15',
    simplified: '打电话',
    pinyin: 'dǎ diàn huà',
    definitions: ['to make a phone call'],
    pos: 'verb',
    hskLevel: 2,
    examples: [
      { chinese: '我给你打电话。', english: 'I\'ll call you.' },
      { chinese: '他在打电话。', english: 'He is on the phone.' },
    ],
  },
  {
    id: '16',
    simplified: '买东西',
    pinyin: 'mǎi dōng xi',
    definitions: ['to go shopping', 'to buy things'],
    pos: 'verb',
    hskLevel: 2,
    examples: [
      { chinese: '我去买东西。', english: 'I\'m going shopping.' },
      { chinese: '你喜欢买东西吗？', english: 'Do you like shopping?' },
    ],
  },
  {
    id: '17',
    simplified: '看电视',
    pinyin: 'kàn diàn shì',
    definitions: ['to watch TV'],
    pos: 'verb',
    hskLevel: 2,
    examples: [
      { chinese: '我在看电视。', english: 'I\'m watching TV.' },
      { chinese: '你喜欢看什么电视？', english: 'What TV shows do you like to watch?' },
    ],
  },
  {
    id: '18',
    simplified: '听音乐',
    pinyin: 'tīng yīn yuè',
    definitions: ['to listen to music'],
    pos: 'verb',
    hskLevel: 2,
    examples: [
      { chinese: '我喜欢听音乐。', english: 'I like listening to music.' },
      { chinese: '他在听音乐。', english: 'He is listening to music.' },
    ],
  },
  {
    id: '19',
    simplified: '跑步',
    pinyin: 'pǎo bù',
    definitions: ['to run', 'jogging'],
    pos: 'verb/noun',
    hskLevel: 2,
    examples: [
      { chinese: '我每天早上跑步。', english: 'I run every morning.' },
      { chinese: '跑步对身体很好。', english: 'Running is good for your health.' },
    ],
  },
  {
    id: '20',
    simplified: '游泳',
    pinyin: 'yóu yǒng',
    definitions: ['to swim', 'swimming'],
    pos: 'verb/noun',
    hskLevel: 2,
    examples: [
      { chinese: '我会游泳。', english: 'I can swim.' },
      { chinese: '夏天我喜欢游泳。', english: 'I like swimming in summer.' },
    ],
  },
];

// Character breakdown data for common characters
export const characterData: Record<string, { pinyin: string; literal: string; contextual: string }> = {
  '银': { pinyin: 'yín', literal: 'silver', contextual: 'silver / money' },
  '行': { pinyin: 'háng', literal: 'walk', contextual: 'business / line of work' },
  '北': { pinyin: 'běi', literal: 'north', contextual: 'north' },
  '京': { pinyin: 'jīng', literal: 'capital', contextual: 'capital city' },
  '学': { pinyin: 'xué', literal: 'learn', contextual: 'to learn / study' },
  '习': { pinyin: 'xí', literal: 'practice', contextual: 'to practice / habit' },
  '中': { pinyin: 'zhōng', literal: 'middle', contextual: 'China / middle' },
  '国': { pinyin: 'guó', literal: 'country', contextual: 'country / nation' },
  '今': { pinyin: 'jīn', literal: 'now', contextual: 'today / present' },
  '天': { pinyin: 'tiān', literal: 'sky', contextual: 'day / sky' },
  '明': { pinyin: 'míng', literal: 'bright', contextual: 'tomorrow / bright' },
  '昨': { pinyin: 'zuó', literal: 'past', contextual: 'yesterday' },
  '喜': { pinyin: 'xǐ', literal: 'happy', contextual: 'to like / happy' },
  '欢': { pinyin: 'huan', literal: 'joyful', contextual: 'joyful / to enjoy' },
  '朋': { pinyin: 'péng', literal: 'friend', contextual: 'friend' },
  '友': { pinyin: 'yǒu', literal: 'friend', contextual: 'friend' },
  '工': { pinyin: 'gōng', literal: 'work', contextual: 'work / labor' },
  '作': { pinyin: 'zuò', literal: 'do', contextual: 'to do / work' },
  '吃': { pinyin: 'chī', literal: 'eat', contextual: 'to eat' },
  '饭': { pinyin: 'fàn', literal: 'rice', contextual: 'meal / rice' },
  '说': { pinyin: 'shuō', literal: 'speak', contextual: 'to speak / say' },
  '话': { pinyin: 'huà', literal: 'speech', contextual: 'speech / words' },
  '看': { pinyin: 'kàn', literal: 'see', contextual: 'to see / look / read' },
  '书': { pinyin: 'shū', literal: 'book', contextual: 'book / document' },
  '写': { pinyin: 'xiě', literal: 'write', contextual: 'to write' },
  '字': { pinyin: 'zì', literal: 'character', contextual: 'character / letter' },
  '打': { pinyin: 'dǎ', literal: 'hit', contextual: 'to make (a call) / to hit' },
  '电': { pinyin: 'diàn', literal: 'electric', contextual: 'electric / phone' },
  '买': { pinyin: 'mǎi', literal: 'buy', contextual: 'to buy' },
  '东': { pinyin: 'dōng', literal: 'east', contextual: 'east / thing' },
  '西': { pinyin: 'xī', literal: 'west', contextual: 'west / thing' },
  '视': { pinyin: 'shì', literal: 'vision', contextual: 'vision / television' },
  '听': { pinyin: 'tīng', literal: 'listen', contextual: 'to listen / hear' },
  '音': { pinyin: 'yīn', literal: 'sound', contextual: 'sound / music' },
  '乐': { pinyin: 'yuè', literal: 'music', contextual: 'music / happy' },
  '跑': { pinyin: 'pǎo', literal: 'run', contextual: 'to run' },
  '步': { pinyin: 'bù', literal: 'step', contextual: 'step / walk' },
  '游': { pinyin: 'yóu', literal: 'swim', contextual: 'to swim / travel' },
  '泳': { pinyin: 'yǒng', literal: 'swim', contextual: 'to swim' },
};