export interface Article {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  source?: string;
  wordCount?: number;
}

export interface ArticleFormData {
  title: string;
  content: string;
  tags?: string[];
  source?: string;
}

export type RootStackParamList = {
  Home: undefined;
  ArticleDetail: { articleId: string };
  ArticleEditor: { articleId?: string };
  Camera: { onCapture: (text: string, title?: string, source?: string) => void };
  Settings: undefined;
};

export type RootDrawerParamList = {
  MainStack: undefined;
  Settings: undefined;
};
