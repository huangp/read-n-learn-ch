import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, TouchableOpacity } from 'react-native';
import { 
  Text, 
  Button, 
  Card, 
  ActivityIndicator,
  Snackbar,
  useTheme,
  Divider,
  List
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscription } from '../hooks/useSubscription';
import { usePurchase } from '../hooks/usePurchase';
import { SubscriptionCard } from '../components/subscription/SubscriptionCard';

const BenefitCard = () => (
    <Card style={styles.featuresCard}>
      <Card.Title title="Your Benefits" />
      <Card.Content>
        <View style={styles.benefitRow}>
          <List.Icon icon="cloud" />
          <Text variant="bodyMedium" style={styles.benefitText}>
            More articles from cloud API
          </Text>
        </View>
        <View style={styles.benefitRow}>
          <List.Icon icon="magnify" />
          <Text variant="bodyMedium" style={styles.benefitText}>
            Lookup with example sentences from cloud API
          </Text>
        </View>
        <View style={styles.benefitRow}>
          <List.Icon icon="cloud" />
          <Text variant="bodyMedium" style={styles.benefitText}>
            Backup and restore articles and progress across devices
          </Text>
        </View>
        <View style={styles.benefitRow}>
          <List.Icon icon="star" />
          <Text variant="bodyMedium" style={styles.benefitText}>
            Personalised AI generated articles to re-enforce learning characters
          </Text>
        </View>
      </Card.Content>
    </Card>
)

export default function SubscriptionScreen() {
  const theme = useTheme();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { 
    status, 
    isLoading, 
    error, 
    clearError, 
    restore 
  } = useSubscription();
  
  const { 
    monthlyProduct,
    yearlyProduct, 
    isPurchasing, 
    purchase 
  } = usePurchase();

  const handleSubscribe = async (productId: string) => {
    clearError();
    const result = await purchase(productId);
    
    if (result.success) {
      setSuccessMessage('Subscription successful!');
    }
  };

  const handleRestore = async () => {
    const result = await restore();
    
    if (!result.success) {
      Alert.alert(
        'No Subscription Found',
        'No active subscription was found for this Apple ID. If you believe this is an error, please try again or contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  // Show active subscription status
  if (status.isActive) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.activeContainer}>
            <View style={[styles.successIcon, { backgroundColor: '#28a745' }]}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            
            <Text variant="headlineMedium" style={styles.activeTitle}>
              You're Subscribed!
            </Text>
            
            <Card style={styles.statusCard}>
              <Card.Content>
                <List.Item
                  title="Plan"
                  description={status.isTrial ? 'Free Trial' : 'Premium'}
                  left={props => <List.Icon {...props} icon="crown" color={theme.colors.primary} />}
                />
                
                {status.expirationDate && (
                  <List.Item
                    title="Renewal Date"
                    description={status.expirationDate.toLocaleDateString()}
                    left={props => <List.Icon {...props} icon="calendar" />}
                  />
                )}
                
                <List.Item
                  title="Auto-Renew"
                  description={status.willRenew ? 'On' : 'Off'}
                  left={props => <List.Icon {...props} icon="sync" />}
                />
              </Card.Content>
            </Card>

            <BenefitCard />

            <Button 
              mode="text" 
              onPress={handleRestore}
              loading={isLoading}
              style={styles.restoreButton}
            >
              Restore Purchases
            </Button>
          </View>
        </ScrollView>

        <Snackbar
          visible={!!error}
          onDismiss={clearError}
          duration={3000}
        >
          {error}
        </Snackbar>
      </SafeAreaView>
    );
  }

  // Show subscription options
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.serviceTitle}>Read & Learn Chinese Premium</Text>
          <Text variant="headlineMedium" style={styles.title}>Upgrade to Premium</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Unlock cloud features and enhance your learning experience
          </Text>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={styles.loadingText}>
              Loading subscription options...
            </Text>
          </View>
        )}

        {!isLoading && (
          <>
            {/* Benefits Section - shown once above both cards */}
            <BenefitCard />

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

            {!monthlyProduct && !yearlyProduct && !error && (
              <Text variant="bodyMedium" style={styles.noProducts}>
                Subscription options are currently unavailable. Please try again later.
              </Text>
            )}

            <Button 
              mode="text" 
              onPress={handleRestore}
              loading={isLoading}
              style={styles.restoreButton}
            >
              Restore Purchases
            </Button>

            <Divider style={styles.divider} />

            <View style={styles.termsContainer}>
              <Text variant="bodySmall" style={styles.terms}>
                Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period.
              </Text>
              <View style={styles.legalLinks}>
                <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                  <Text variant="bodySmall" style={[styles.termsLink, { color: theme.colors.primary }]}>
                    Terms of Use (EULA)
                  </Text>
                </TouchableOpacity>
                <Text variant="bodySmall" style={styles.termsSeparator}> • </Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://huangp.github.io/read-n-learn-ch/PRIVACY_POLICY.html')}>
                  <Text variant="bodySmall" style={[styles.termsLink, { color: theme.colors.primary }]}>
                    Privacy Policy
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

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

      <Snackbar
        visible={!!successMessage}
        onDismiss={() => setSuccessMessage(null)}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setSuccessMessage(null),
        }}
      >
        {successMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    color: '#6c757d',
  },
  noProducts: {
    textAlign: 'center',
    color: '#6c757d',
    marginVertical: 40,
  },
  activeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '700',
  },
  activeTitle: {
    fontWeight: '700',
    color: '#212529',
    marginBottom: 24,
  },
  statusCard: {
    width: '100%',
    marginBottom: 24,
  },
  featuresCard: {
    width: '100%',
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  benefitText: {
    flex: 1,
    marginLeft: 8,
    flexWrap: 'wrap',
  },
  benefitsCard: {
    width: '100%',
    marginBottom: 16,
  },
  restoreButton: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 20,
  },
  termsContainer: {
    marginTop: 20,
  },
  terms: {
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 18,
  },
  serviceTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#6c757d',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
  termsSeparator: {
    color: '#adb5bd',
  },
});
