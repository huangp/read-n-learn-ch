export interface SegmentedWord {
  id: string;
  text: string;
  start: number;
  end: number;
  type: 'chinese' | 'other';
  isInDictionary: boolean;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  source?: string;
  wordCount?: number;
  segments?: SegmentedWord[]; // Pre-segmented words for tap-to-lookup
}

export interface ArticleFormData {
  title: string;
  content: string;
  tags?: string[];
  source?: string;
}

export interface ReadingProgress {
  articleId: string;
  charPosition?: number; // Character index in content, rounded to nearest word boundary
  totalChars?: number;
  currentPage: number;
  totalPages: number;
  lastReadAt: number;
}

export type RootStackParamList = {
  Home: undefined;
  ArticleDetail: { articleId: string };
  ArticleEditor: { articleId?: string };
  Camera: { onCapture: (text: string, title?: string, source?: string) => void };
  Settings: undefined;
};

