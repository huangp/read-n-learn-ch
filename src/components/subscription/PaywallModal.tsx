import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Modal, 
  Portal, 
  Text, 
  IconButton, 
  useTheme,
  Snackbar
} from 'react-native-paper';
import { usePurchase } from '../../hooks/usePurchase';
import { SubscriptionCard } from './SubscriptionCard';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  featureName?: string;
}

export function PaywallModal({ 
  visible, 
  onClose, 
  featureName = 'Premium'
}: PaywallModalProps) {
  const theme = useTheme();
  const { 
    products, 
    monthlyProduct, 
    yearlyProduct, 
    isPurchasing, 
    purchase, 
    error, 
    clearError 
  } = usePurchase();

  const handleSubscribe = async (productId: string) => {
    clearError();
    const result = await purchase(productId);
    if (result.success) {
      onClose();
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>Upgrade to Premium</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
          >
            <Text variant="bodyMedium" style={styles.description}>
              Subscribe to access {featureName} and unlock all premium features.
            </Text>

            {yearlyProduct && (
              <SubscriptionCard
                product={yearlyProduct}
                isPopular={true}
                onSubscribe={() => handleSubscribe(yearlyProduct.identifier)}
                disabled={isPurchasing}
              />
            )}

            {monthlyProduct && (
              <SubscriptionCard
                product={monthlyProduct}
                onSubscribe={() => handleSubscribe(monthlyProduct.identifier)}
                disabled={isPurchasing}
              />
            )}

            {!monthlyProduct && !yearlyProduct && (
              <Text variant="bodyMedium" style={styles.loadingText}>
                Loading subscription options...
              </Text>
            )}

            <View style={styles.footer}>
              <Text variant="bodySmall" style={styles.terms}>
                Subscriptions auto-renew. Cancel anytime in your device settings.
              </Text>
            </View>
          </ScrollView>
        </View>

        <Snackbar
          visible={!!error}
          onDismiss={clearError}
          duration={3000}
          action={{
            label: 'Dismiss',
            onPress: clearError,
          }}
        >
          {error}
        </Snackbar>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  container: {
    backgroundColor: '#fff',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontWeight: '700',
  },
  closeButton: {
    margin: 0,
  },
  content: {
    padding: 20,
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    color: '#495057',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6c757d',
    marginVertical: 40,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  },
  terms: {
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 18,
  },
});
