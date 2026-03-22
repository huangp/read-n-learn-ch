import React, { useState, useEffect, useCallback } from 'react';
import { IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { ArticleSyncService } from '../services/articleSync';
import SubscriptionManager from '../services/subscription/SubscriptionManager';
import { useSubscriptionStore } from '../store/subscriptionStore';

interface SyncButtonProps {
  onSyncComplete?: (message: string) => void;
  onShowMessage?: (message: string) => void;
}

export function SyncButton({ onSyncComplete, onShowMessage }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasCloudAccess, setHasCloudAccess] = useState(false);
  const [isSyncNeeded, setIsSyncNeeded] = useState(true);

  // Subscribe to subscription store for real-time updates
  const subscriptionStatus = useSubscriptionStore((state) => state.status);

  const checkStatus = useCallback(async () => {
    const access = await SubscriptionManager.hasCloudAccess();
    setHasCloudAccess(access);
    
    const needed = await ArticleSyncService.isSyncNeeded();
    setIsSyncNeeded(needed);
  }, []);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Re-check status when screen gains focus
  useFocusEffect(
    useCallback(() => {
      checkStatus();
    }, [checkStatus])
  );

  // Re-check status when subscription changes
  useEffect(() => {
    checkStatus();
  }, [subscriptionStatus, checkStatus]);

  const handlePress = async () => {
    // If no cloud access, show message and return
    if (!hasCloudAccess) {
      onShowMessage?.('Subscribe to use this feature');
      return;
    }

    // If already syncing, ignore
    if (isSyncing) {
      return;
    }

    // If sync not needed, show message and return
    if (!isSyncNeeded) {
      const days = await ArticleSyncService.getDaysSinceLastSync();
      const message = days !== null 
        ? `Synced ${days} days ago`
        : 'Already synced';
      onShowMessage?.(message);
      return;
    }

    // Perform sync
    setIsSyncing(true);
    try {
      const result = await ArticleSyncService.syncArticles();
      onSyncComplete?.(result.message);
      
      // Update status after sync
      await checkStatus();
    } catch (error) {
      onSyncComplete?.('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const isDisabled = isSyncing;

  return (
    <IconButton
      icon="cloud-download"
      size={24}
      onPress={handlePress}
      disabled={isDisabled}
      loading={isSyncing}
    />
  );
}
