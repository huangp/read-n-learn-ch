import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, Chip, useTheme } from 'react-native-paper';
import { SubscriptionProduct } from '../../services/subscription/types';

interface SubscriptionCardProps {
  product: SubscriptionProduct;
  isPopular?: boolean;
  onSubscribe: () => void;
  disabled?: boolean;
}

export function SubscriptionCard({ 
  product, 
  isPopular = false, 
  onSubscribe,
  disabled = false 
}: SubscriptionCardProps) {
  const theme = useTheme();
  const isYearly = product.period === 'yearly';
  const savings = isYearly ? 'Save 33%' : null;

  return (
    <Card 
      style={[
        styles.container, 
        isPopular && { borderColor: theme.colors.primary, borderWidth: 2 }
      ]}
    >
      <Card.Content>
        {isPopular && (
          <Chip 
            icon="star" 
            style={[styles.popularBadge, { backgroundColor: theme.colors.primary }]}
            textStyle={{ color: '#fff' }}
          >
            Most Popular
          </Chip>
        )}
        
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.period}>
            {isYearly ? 'Yearly' : 'Monthly'}
          </Text>
          {savings && (
            <Chip style={styles.savingsChip} textStyle={{ color: '#28a745' }}>
              {savings}
            </Chip>
          )}
        </View>

        <View style={styles.priceContainer}>
          <Text variant="displaySmall" style={styles.price}>
            {product.priceString}
          </Text>
          <Text variant="bodyMedium" style={styles.periodLabel}>
            /{isYearly ? 'year' : 'month'}
          </Text>
        </View>

        {product.trialPeriod && (
          <Chip 
            style={[styles.trialBadge, { backgroundColor: '#28a745' }]}
            textStyle={{ color: '#fff' }}
          >
            {product.trialPeriod} FREE TRIAL
          </Chip>
        )}

        <Button
          mode="contained"
          onPress={onSubscribe}
          disabled={disabled}
          loading={disabled}
          style={styles.button}
          buttonColor={isPopular ? theme.colors.primary : undefined}
        >
          {disabled ? 'Processing...' : 'Subscribe'}
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 16,
  },
  popularBadge: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  period: {
    fontWeight: '700',
  },
  savingsChip: {
    backgroundColor: '#d4edda',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  price: {
    fontWeight: '700',
  },
  periodLabel: {
    marginLeft: 4,
    color: '#6c757d',
  },
  trialBadge: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
  },
});
