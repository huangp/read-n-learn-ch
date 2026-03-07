import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionManager } from '../services/subscription/SubscriptionManager';
import { 
  SubscriptionProduct, 
  SubscriptionStatus,
  PurchaseResult,
  SubscriptionEventPayload 
} from '../services/subscription/types';

interface SubscriptionState {
  // State
  status: SubscriptionStatus;
  products: SubscriptionProduct[];
  isLoading: boolean;
  isPurchasing: boolean;
  lastError: string | null;

  // Actions
  initialize: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  loadProducts: () => Promise<void>;
  purchase: (productId: string) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: {
        isActive: false,
        isTrial: false,
        willRenew: false,
        hasCloudAccess: false,
      },
      products: [],
      isLoading: false,
      isPurchasing: false,
      lastError: null,

      // Initialize subscription manager
      initialize: async () => {
        try {
          await SubscriptionManager.initialize();
          SubscriptionManager.setupPurchaseListener();
          
          // Add listener for status changes
          SubscriptionManager.addListener((payload: SubscriptionEventPayload) => {
            if (payload.event === 'status_changed' || 
                payload.event === 'purchase_completed' ||
                payload.event === 'restore_completed') {
              get().refreshStatus();
            }
          });

          // Load initial status and products
          await get().refreshStatus();
          await get().loadProducts();
        } catch (error) {
          console.error('[SubscriptionStore] Initialization failed:', error);
        }
      },

      // Refresh subscription status
      refreshStatus: async () => {
        set({ isLoading: true });
        try {
          const status = await SubscriptionManager.getStatus();
          set({ status, isLoading: false });
        } catch (error) {
          set({ 
            isLoading: false, 
            lastError: 'Failed to refresh subscription status' 
          });
        }
      },

      // Load available products
      loadProducts: async () => {
        try {
          const products = await SubscriptionManager.getProducts();
          set({ products });
        } catch (error) {
          console.error('[SubscriptionStore] Failed to load products:', error);
        }
      },

      // Purchase subscription
      purchase: async (productId: string) => {
        set({ isPurchasing: true, lastError: null });
        try {
          const result = await SubscriptionManager.purchase(productId);
          
          if (!result.success) {
            set({ 
              isPurchasing: false, 
              lastError: result.error || 'Purchase failed' 
            });
          } else {
            set({ isPurchasing: false });
            // Refresh status after successful purchase
            await get().refreshStatus();
          }
          
          return result;
        } catch (error: any) {
          set({ 
            isPurchasing: false, 
            lastError: error.message || 'Purchase failed' 
          });
          return { success: false, error: error.message };
        }
      },

      // Restore purchases
      restore: async () => {
        set({ isLoading: true, lastError: null });
        try {
          const result = await SubscriptionManager.restore();
          
          if (!result.success) {
            set({ 
              isLoading: false, 
              lastError: result.error || 'No active subscription found' 
            });
          } else {
            set({ isLoading: false });
            await get().refreshStatus();
          }
          
          return result;
        } catch (error: any) {
          set({ 
            isLoading: false, 
            lastError: error.message || 'Restore failed' 
          });
          return { success: false, error: error.message };
        }
      },

      // Clear error message
      clearError: () => set({ lastError: null }),
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist status, not transient state
      partialize: (state) => ({ 
        status: state.status,
      }),
    }
  )
);
