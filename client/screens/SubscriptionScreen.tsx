import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  Chip,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { subscriptionAPI, SubscriptionTier } from '../api/subscription';
import { userAPI } from '../api/users';

export const SubscriptionScreen: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const response = await subscriptionAPI.getTiers();
      if (response.success) {
        setTiers(response.tiers);
      }
    } catch (error) {
      console.error('Error loading tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (tier.tier === user?.tier) {
      Alert.alert('Current Plan', 'You are already on this plan');
      return;
    }

    Alert.alert(
      'Upgrade Subscription',
      `Upgrade to ${tier.tier.toUpperCase()} for $${tier.price}${
        tier.billingPeriod !== 'lifetime' ? `/${tier.billingPeriod}` : ''
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: async () => {
            setUpgrading(tier.tier);
            try {
              const response = await subscriptionAPI.upgradeTier(tier.tier);
              if (response.success) {
                const profileRes = await userAPI.getProfile();
                if (profileRes.success) {
                  updateUser(profileRes.user);
                }
                Alert.alert(
                  'Success',
                  response.message || 'Subscription upgraded successfully'
                );
              }
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.message ||
                  'Failed to upgrade subscription'
              );
            } finally {
              setUpgrading(null);
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(0)} ${sizes[i]}`;
  };

  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'free':
        return '#757575';
      case 'pro':
        return '#4caf50';
      case 'unlimited':
        return '#ff9800';
      default:
        return '#6200ee';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.currentCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.currentTitle}>
              Current Plan
            </Text>
            <Chip
              icon="crown"
              style={[
                styles.currentChip,
                { backgroundColor: getTierColor(user?.tier || 'free') },
              ]}
              textStyle={styles.currentChipText}
            >
              {user?.tier?.toUpperCase() || 'FREE'}
            </Chip>
          </Card.Content>
        </Card>

        <Text variant="titleLarge" style={styles.sectionTitle}>
          Available Plans
        </Text>

        {tiers.map((tier) => {
          const isCurrentTier = tier.tier === user?.tier;
          const isUpgrading = upgrading === tier.tier;

          return (
            <Card
              key={tier.tier}
              style={[
                styles.tierCard,
                isCurrentTier && styles.currentTierCard,
              ]}
            >
              <Card.Content>
                <View style={styles.tierHeader}>
                  <Text variant="headlineSmall" style={styles.tierName}>
                    {tier.tier.toUpperCase()}
                  </Text>
                  {isCurrentTier && (
                    <Chip mode="flat" style={styles.currentBadge}>
                      Current
                    </Chip>
                  )}
                </View>

                <Text variant="displaySmall" style={styles.price}>
                  ${tier.price}
                  {tier.billingPeriod !== 'lifetime' && (
                    <Text variant="bodyLarge">
                      /{tier.billingPeriod}
                    </Text>
                  )}
                </Text>

                <Divider style={styles.divider} />

                <View style={styles.features}>
                  <View style={styles.feature}>
                    <Text variant="bodyLarge">Storage:</Text>
                    <Text variant="bodyLarge" style={styles.featureValue}>
                      {formatBytes(tier.limitSize)}
                    </Text>
                  </View>
                  <View style={styles.feature}>
                    <Text variant="bodyLarge">Files:</Text>
                    <Text variant="bodyLarge" style={styles.featureValue}>
                      {tier.limitItems}
                    </Text>
                  </View>
                  {tier.tier === 'unlimited' && (
                    <Text variant="bodySmall" style={styles.unlimitedNote}>
                      * Pay as you grow: ${tier.price} per MB per day
                    </Text>
                  )}
                </View>
              </Card.Content>

              {!isCurrentTier && (
                <Card.Actions>
                  <Button
                    mode="contained"
                    onPress={() => handleUpgrade(tier)}
                    loading={isUpgrading}
                    disabled={isUpgrading}
                    style={styles.upgradeButton}
                  >
                    {tier.price === 0 ? 'Select Plan' : 'Upgrade'}
                  </Button>
                </Card.Actions>
              )}
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  currentCard: {
    marginBottom: 24,
    backgroundColor: '#e3f2fd',
    elevation: 2,
  },
  currentTitle: {
    marginBottom: 8,
    opacity: 0.7,
  },
  currentChip: {
    alignSelf: 'flex-start',
  },
  currentChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  tierCard: {
    marginBottom: 16,
    elevation: 2,
  },
  currentTierCard: {
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierName: {
    fontWeight: 'bold',
  },
  currentBadge: {
    backgroundColor: '#6200ee',
  },
  price: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  divider: {
    marginBottom: 16,
  },
  features: {
    gap: 8,
  },
  feature: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureValue: {
    fontWeight: 'bold',
  },
  unlimitedNote: {
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  upgradeButton: {
    flex: 1,
  },
});
