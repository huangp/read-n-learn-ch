import { useEffect } from 'react';
import { useSubscriptionStore } from '../store/subscriptionStore';

/**
 * Hook to access subscription status and management
 */
export function useSubscription() {
  const store = useSubscriptionStore();

  useEffect(() => {
    // Initialize on first use
    store.initialize();
  }, []);

  return {
    // Status
    status: store.status,
    isActive: store.status.isActive,
    hasCloudAccess: store.status.hasCloudAccess,
    isTrial: store.status.isTrial,
    expirationDate: store.status.expirationDate,
    willRenew: store.status.willRenew,

    // Loading states
    isLoading: store.isLoading,
    isPurchasing: store.isPurchasing,

    // Error
    error: store.lastError,
    clearError: store.clearError,

    // Actions
    refreshStatus: store.refreshStatus,
    restore: store.restore,
  };
}
