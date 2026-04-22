import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import SubscriptionManager from '../services/subscription/SubscriptionManager';
import { useSubscriptionStore } from '../store/subscriptionStore';
import CharacterRecognitionService from '../services/characterRecognition';
import ArticleGenerationLimitService from '../services/articleGenerationLimit';
import { ApiClient } from '../api/client';
import type { GenerateArticleResponse } from '../api/generated';
import { GenerateArticleDialog } from './GenerateArticleDialog';
import {progressService} from "../services/progressService";

const MIN_KNOWN_CHARS = 50;

export interface GenerateArticleButtonRef {
  triggerGenerate: () => void;
}

interface GenerateArticleButtonProps {
  onShowMessage?: (message: string) => void;
  onShowPaywall?: () => void;
  onArticleGenerated?: (article: GenerateArticleResponse) => void;
  hidden?: boolean;
}

export const GenerateArticleButton = forwardRef<GenerateArticleButtonRef, GenerateArticleButtonProps>(
  function GenerateArticleButton(props, ref) {
    const { onShowMessage, onShowPaywall, onArticleGenerated, hidden } = props;
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasCloudAccess, setHasCloudAccess] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);

    const subscriptionStatus = useSubscriptionStore((state) => state.status);

    const checkStatus = useCallback(async () => {
      const access = await SubscriptionManager.hasCloudAccess();
      setHasCloudAccess(access);
    }, []);

    useFocusEffect(
      useCallback(() => {
        checkStatus();
      }, [checkStatus])
    );

    React.useEffect(() => {
      checkStatus();
    }, [subscriptionStatus, checkStatus]);

    const checkPrerequisites = async (): Promise<boolean> => {
      if (!hasCloudAccess) {
        onShowPaywall?.();
        return false;
      }

      // Check known characters count
      const knownCount = await CharacterRecognitionService.getKnownVocabularyCount();
      if (knownCount < MIN_KNOWN_CHARS) {
        onShowMessage?.(
          `Need at least ${MIN_KNOWN_CHARS} known characters (you have ${knownCount})`
        );
        return false;
      }

      // Check monthly limit
      const hasQuota = await ArticleGenerationLimitService.hasRemainingQuota();
      if (!hasQuota) {
        onShowMessage?.(
          `Monthly article generation limit reached. Resets next month.`
        );
        return false;
      }

      return true;
    };

    const handlePress = async () => {
      if (isGenerating) return;

      const canProceed = await checkPrerequisites();
      if (!canProceed) return;

      setDialogVisible(true);
    };

    const handleGenerate = async (topic: string | undefined) => {
      setIsGenerating(true);
      try {
        const [knownVocabulary, learningVocabulary] = await Promise.all([
          CharacterRecognitionService.getKnownVocabulary(),
          progressService.getWordsForReview(50),
        ]);

        const response = await ApiClient.generateArticle({
          known: knownVocabulary,
          learning: learningVocabulary.length > 0 ? learningVocabulary.map(vocab => vocab.word) : undefined,
          topic: topic,
        });
        // console.debug("==== cloud generated content", response);

        await ArticleGenerationLimitService.incrementUsage();
        setDialogVisible(false);
        onArticleGenerated?.(response);
      } catch (error) {
        console.error('[GenerateArticleButton] Generation failed:', error);
        setIsGenerating(false);
        onShowMessage?.('Failed to generate article. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    };

    useImperativeHandle(ref, () => ({
      triggerGenerate: handlePress,
    }));

    return (
      <>
        {!hidden && (
          <IconButton
            icon="creation"
            size={24}
            onPress={handlePress}
            disabled={isGenerating}
            loading={isGenerating}
          />
        )}
        <GenerateArticleDialog
          visible={dialogVisible}
          onDismiss={() => {
            setDialogVisible(false);
            setIsGenerating(false);
          }}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      </>
    );
  }
);
