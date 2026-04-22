import Purchases, { 
  PurchasesPackage, 
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE
} from 'react-native-purchases';
import { 
  SubscriptionProduct, 
  SubscriptionStatus, 
  PurchaseResult,
  SubscriptionEventPayload,
  SubscriptionListener 
} from './types';

// RevenueCat API Keys - Replace with your actual keys
const REVENUECAT_API_KEYS = {
  // TODO this is Test Store api Key
  ios: 'test_fPzHynWmeHaSJTqWWfAvNDKNLQQ',
  // ios: 'appl_GxmQkNQAzAyhHjxkoXktiuBZZmI',
  // android: 'YOUR_ANDROID_PUBLIC_SDK_KEY',
};

// Entitlement identifier for cloud access
const CLOUD_ACCESS_ENTITLEMENT = 'readnlearnch Pro';

/**
 * SubscriptionManager - Handles all in-app purchase operations
 * Wraps RevenueCat SDK for subscription management
 */
class SubscriptionManager {
  private static listeners: SubscriptionListener[] = [];
  private static isInitialized = false;

  /**
   * Initialize RevenueCat SDK
   * Call this once when app starts
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Configure RevenueCat with placeholder keys
      // Replace with actual keys before production
      const apiKey =
        REVENUECAT_API_KEYS.ios;

      Purchases.configure({ apiKey });

      // Enable debug logs in development
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      this.isInitialized = true;
      console.log('[SubscriptionManager] Initialized successfully');
    } catch (error) {
      console.error('[SubscriptionManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get available subscription products
   */
  static async getProducts(): Promise<SubscriptionProduct[]> {
    try {
      const offerings = await Purchases.getOfferings();
      
      if (!offerings.current) {
        console.warn('[SubscriptionManager] No offerings available');
        return [];
      }

      // Debug: Log all available packages
      console.log('[SubscriptionManager] Available packages:', offerings.current.availablePackages.map(p => ({
        identifier: p.product.identifier,
        packageType: p.packageType,
        price: p.product.priceString
      })));

      const products: SubscriptionProduct[] = [];

      for (const pkg of offerings.current.availablePackages) {
        const product = pkg.product;
        // Use packageType from RevenueCat to determine period (more reliable than identifier matching)
        const period = pkg.packageType === 'ANNUAL'
          ? 'yearly' 
          : 'monthly';

        console.log(`[SubscriptionManager] Processing product: ${product.identifier} (packageType: ${pkg.packageType}) -> ${period}`);

        products.push({
          identifier: product.identifier,
          description: product.description,
          price: product.price,
          priceString: product.priceString,
          currency: product.currencyCode,
          period,
          trialPeriod: product.introPrice?.period || null,
        });
      }

      return products;
    } catch (error) {
      console.error('[SubscriptionManager] Failed to get products:', error);
      return [];
    }
  }

  /**
   * Purchase a subscription
   */
  static async purchase(productId: string): Promise<PurchaseResult> {
    this.notifyListeners({ event: 'purchase_started', productIdentifier: productId });

    try {
      const offerings = await Purchases.getOfferings();
      
      if (!offerings.current) {
        throw new Error('No offerings available');
      }

      const pkg = offerings.current.availablePackages.find(
        p => p.product.identifier === productId
      );

      if (!pkg) {
        throw new Error(`Product ${productId} not found`);
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      this.notifyListeners({ 
        event: 'purchase_completed', 
        productIdentifier: productId 
      });

      return {
        success: true,
        productIdentifier: productId,
      };
    } catch (error: any) {
      // User cancelled is not an error
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return {
          success: false,
          error: 'Purchase cancelled',
        };
      }

      console.error('[SubscriptionManager] Purchase failed:', error);
      
      this.notifyListeners({ 
        event: 'purchase_failed', 
        productIdentifier: productId,
        error: error.message 
      });

      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  /**
   * Restore previous purchases
   */
  static async restore(): Promise<PurchaseResult> {
    this.notifyListeners({ event: 'restore_started' });

    try {
      const customerInfo = await Purchases.restorePurchases();
      
      const hasActiveSubscription = this.checkCloudAccess(customerInfo);
      
      this.notifyListeners({ event: 'restore_completed' });

      return {
        success: hasActiveSubscription,
        productIdentifier: hasActiveSubscription 
          ? this.getActiveProductIdentifier(customerInfo)
          : undefined,
        error: hasActiveSubscription ? undefined : 'No active subscription found',
      };
    } catch (error: any) {
      console.error('[SubscriptionManager] Restore failed:', error);
      
      this.notifyListeners({ 
        event: 'restore_failed',
        error: error.message 
      });

      return {
        success: false,
        error: error.message || 'Restore failed',
      };
    }
  }

  /**
   * Get current subscription status
   */
  static async getStatus(): Promise<SubscriptionStatus> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return this.mapCustomerInfoToStatus(customerInfo);
    } catch (error) {
      console.error('[SubscriptionManager] Failed to get status:', error);
      return {
        isActive: false,
        isTrial: false,
        willRenew: false,
        hasCloudAccess: false,
      };
    }
  }

  /**
   * Check if user has cloud access entitlement
   */
  static async hasCloudAccess(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return this.checkCloudAccess(customerInfo);
    } catch (error) {
      return false;
    }
  }

  /**
   * Add listener for subscription events
   */
  static addListener(listener: SubscriptionListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Setup RevenueCat listener for purchase updates
   * Call this once after initialization
   */
  static setupPurchaseListener(): void {
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      const status = this.mapCustomerInfoToStatus(customerInfo);
      this.notifyListeners({ event: 'status_changed' });
    });
  }

  // Private helper methods
  
  private static checkCloudAccess(customerInfo: CustomerInfo): boolean {
    const entitlement = customerInfo.entitlements.active[CLOUD_ACCESS_ENTITLEMENT];
    return entitlement?.isActive ?? false;
  }

  private static getActiveProductIdentifier(customerInfo: CustomerInfo): string | undefined {
    const entitlement = customerInfo.entitlements.active[CLOUD_ACCESS_ENTITLEMENT];
    return entitlement?.productIdentifier;
  }

  private static mapCustomerInfoToStatus(customerInfo: CustomerInfo): SubscriptionStatus {
    const entitlement = customerInfo.entitlements.active[CLOUD_ACCESS_ENTITLEMENT];
    const hasCloudAccess = entitlement?.isActive ?? false;

    return {
      isActive: hasCloudAccess,
      isTrial: entitlement?.periodType === 'TRIAL',
      productIdentifier: entitlement?.productIdentifier,
      expirationDate: entitlement?.expirationDate 
        ? new Date(entitlement.expirationDate) 
        : undefined,
      willRenew: entitlement?.willRenew ?? false,
      hasCloudAccess,
    };
  }

  private static notifyListeners(payload: SubscriptionEventPayload): void {
    this.listeners.forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        console.error('[SubscriptionManager] Listener error:', error);
      }
    });
  }

  /**
   * Log out current user and create new anonymous user
   * This effectively resets subscription state for testing
   * Only available in development mode
   */
  static async logOut(): Promise<boolean> {
    try {
      // Check if user is anonymous - can't log out anonymous users
      const customerInfo = await Purchases.getCustomerInfo();
      const isAnonymous = customerInfo.originalAppUserId?.startsWith('$RCAnonymousID');
      
      if (isAnonymous) {
        console.log('[SubscriptionManager] User is already anonymous, skipping logOut');
        return false;
      }
      
      await Purchases.logOut();
      console.log('[SubscriptionManager] Logged out, new anonymous user created');
      return true;
    } catch (error) {
      console.error('[SubscriptionManager] Log out failed:', error);
      throw error;
    }
  }

  /**
   * Get current App User ID for debugging
   * Only available in development mode
   */
  static async getAppUserID(): Promise<string> {
    return await Purchases.getAppUserID();
  }
}

export default SubscriptionManager

// Import Platform for OS detection
import { Platform } from 'react-native';
