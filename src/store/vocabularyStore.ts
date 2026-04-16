import { create } from 'zustand';

interface VocabularyState {
  lastVocabularyChangeAt: number;
  markArticleMetaStale: () => void;
}

export const vocabularyStore = create<VocabularyState>((set) => ({
  lastVocabularyChangeAt: 0,
  markArticleMetaStale: () => set({ lastVocabularyChangeAt: Date.now() }),
}));
