import { useSubscriptionStore } from '../store/subscriptionStore';
import { SubscriptionProduct } from '../services/subscription/types';

/**
 * Hook to handle purchase flow
 */
export function usePurchase() {
  const store = useSubscriptionStore();

  return {
    // Products
    products: store.products,
    monthlyProduct: store.products.find(p => p.period === 'monthly'),
    yearlyProduct: store.products.find(p => p.period === 'yearly'),

    // Purchase state
    isPurchasing: store.isPurchasing,
    error: store.lastError,
    clearError: store.clearError,

    // Actions
    purchase: store.purchase,
    loadProducts: store.loadProducts,
  };
}
