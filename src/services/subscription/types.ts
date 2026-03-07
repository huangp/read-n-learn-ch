/**
 * Subscription types and interfaces
 */

export interface SubscriptionProduct {
  identifier: string;
  description: string;
  price: number;
  priceString: string;
  currency: string;
  period: 'monthly' | 'yearly';
  trialPeriod: string | null;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  productIdentifier?: string;
  expirationDate?: Date;
  willRenew: boolean;
  hasCloudAccess: boolean;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  productIdentifier?: string;
}

export type SubscriptionEvent = 
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_failed'
  | 'restore_started'
  | 'restore_completed'
  | 'restore_failed'
  | 'status_changed';

export interface SubscriptionEventPayload {
  event: SubscriptionEvent;
  productIdentifier?: string;
  error?: string;
}

export type SubscriptionListener = (payload: SubscriptionEventPayload) => void;
