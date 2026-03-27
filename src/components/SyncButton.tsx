import React, { useState, useEffect, useCallback } from 'react';
import { IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { ArticleSyncService } from '../services/articleSync';
import SubscriptionManager from '../services/subscription/SubscriptionManager';
import { useSubscriptionStore } from '../store/subscriptionStore';

interface SyncButtonProps {
  onSyncComplete?: (message: string) => void;
  onShowMessage?: (message: string) => void;
  onShowAvailableArticles?: () => void;
  hidden?: boolean;
}

export interface SyncButtonRef {
  triggerSync: () => void;
}

export const SyncButton = React.forwardRef<SyncButtonRef, SyncButtonProps>(function SyncButton({ onSyncComplete, onShowMessage, onShowAvailableArticles, hidden }, ref) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasCloudAccess, setHasCloudAccess] = useState(false);
  const [isSyncNeeded, setIsSyncNeeded] = useState(true);

  React.useImperativeHandle(ref, () => ({
    triggerSync: handlePress,
  }));

  const subscriptionStatus = useSubscriptionStore((state) => state.status);

  const checkStatus = useCallback(async () => {
    const access = await SubscriptionManager.hasCloudAccess();
    setHasCloudAccess(access);

    const needed = await ArticleSyncService.isSyncNeeded();
    setIsSyncNeeded(needed);
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useFocusEffect(
    useCallback(() => {
      checkStatus();
    }, [checkStatus])
  );

  useEffect(() => {
    checkStatus();
  }, [subscriptionStatus, checkStatus]);

  const handlePress = async () => {
    if (!hasCloudAccess) {
      onShowAvailableArticles?.();
      return;
    }

    if (isSyncing) {
      return;
    }

    if (!isSyncNeeded) {
      const days = await ArticleSyncService.getDaysSinceLastSync();
      const message = days !== null
        ? `Synced ${days} days ago`
        : 'Already synced';
      onShowMessage?.(message);
      return;
    }

    setIsSyncing(true);
    try {
      const result = await ArticleSyncService.syncArticles();
      onSyncComplete?.(result.message);

      await checkStatus();
    } catch (error) {
      onSyncComplete?.('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const isDisabled = isSyncing;

  if (hidden) {
    return null;
  }

  return (
    <IconButton
      icon="cloud-download"
      size={24}
      onPress={handlePress}
      disabled={isDisabled}
      loading={isSyncing}
    />
  );
});
