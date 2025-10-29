import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Card,
  Text,
  ProgressBar,
  Button,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api/users';
import { filesAPI } from '../api/files';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
  });
  const [quota, setQuota] = useState<{
    used: { size: number; items: number };
    remaining: { size: number | null; items: number | null };
    limits: { size: number | null; items: number | null };
    isUnlimited: boolean;
  }>({
    used: { size: 0, items: 0 },
    remaining: { size: 0, items: 0 },
    limits: { size: 0, items: 0 },
    isUnlimited: false,
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        userAPI.getProfile(),
        userAPI.getStats(),
      ]);

      if (profileRes.success) {
        updateUser(profileRes.user);
        setQuota(profileRes.user.quota || quota);
      }

      if (statsRes.success) {
        setStats(statsRes.data.stats);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatBytes = (bytes: number | null | undefined): string => {
    if (bytes === null || bytes === undefined) return 'Unlimited';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const storagePercentage = quota?.limits?.size && quota?.limits?.size > 0
    ? (quota.used.size / quota.limits.size)
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.welcome}>
              Welcome, {user?.name}!
            </Text>
            <View style={styles.tierContainer}>
              <Chip
                icon="crown"
                mode="flat"
                style={[
                  styles.tierChip,
                  user?.tier === 'pro' && styles.proChip,
                  user?.tier === 'unlimited' && styles.unlimitedChip,
                ]}
              >
                {user?.tier?.toUpperCase() || 'FREE'}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Storage Usage" />
          <Card.Content>
            <View style={styles.storageInfo}>
              <Text variant="bodyLarge">
                {formatBytes(quota?.used?.size)} of {formatBytes(quota?.limits?.size)}
              </Text>
              {quota?.isUnlimited ? (
                <Text variant="bodySmall" style={styles.percentage}>
                  Unlimited Storage
                </Text>
              ) : (
                <Text variant="bodySmall" style={styles.percentage}>
                  {(storagePercentage * 100).toFixed(1)}% used
                </Text>
              )}
            </View>
            {!quota?.isUnlimited && (
              <ProgressBar
                progress={storagePercentage}
                color={storagePercentage > 0.9 ? '#ff0000' : '#6200ee'}
                style={styles.progressBar}
              />
            )}
            <Text variant="bodySmall" style={styles.remaining}>
              {quota?.isUnlimited ? 'No limits' : `${formatBytes(quota?.remaining?.size)} remaining`}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Files" />
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="displaySmall">{stats?.totalFiles}</Text>
                <Text variant="bodySmall">Total Files</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="displaySmall">
                  {quota?.used?.items}/{quota?.limits?.items ?? '∞'}
                </Text>
                <Text variant="bodySmall">Files Used</Text>
              </View>
            </View>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Files')}
              icon="folder"
            >
              View Files
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Account" />
          <Card.Content>
            <Text variant="bodyMedium">
              Manage your profile, view subscription plans, and account settings
            </Text>
          </Card.Content>
          <Card.Actions style={styles.accountActions}>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Profile')}
              icon="account"
              style={styles.accountButton}
            >
              Profile
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Subscription')}
              icon="crown"
              style={styles.accountButton}
            >
              Plans
            </Button>
          </Card.Actions>
        </Card>

        {user?.tier === 'free' && (
          <Card style={[styles.card, styles.upgradeCard]}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.upgradeTitle}>
                Upgrade to Pro
              </Text>
              <Text variant="bodyMedium" style={styles.upgradeText}>
                Get 100MB storage and 100 files for just $10/month
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Subscription')}
                icon="arrow-up-circle"
              >
                Upgrade Now
              </Button>
            </Card.Actions>
          </Card>
        )}
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
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  welcome: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  tierContainer: {
    marginTop: 8,
  },
  tierChip: {
    alignSelf: 'flex-start',
  },
  proChip: {
    backgroundColor: '#4caf50',
  },
  unlimitedChip: {
    backgroundColor: '#ff9800',
  },
  storageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  percentage: {
    opacity: 0.7,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  remaining: {
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  upgradeCard: {
    backgroundColor: '#e3f2fd',
  },
  upgradeTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  upgradeText: {
    marginBottom: 8,
  },
  accountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  accountButton: {
    flex: 1,
  },
});
