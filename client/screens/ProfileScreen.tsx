import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Card,
  Text,
  TextInput,
  Button,
  List,
  Divider,
  Dialog,
  Portal,
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api/users';

export const ProfileScreen: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const response = await userAPI.updateProfile({ name });
      if (response.success) {
        updateUser(response.user);
        setEditDialogVisible(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await userAPI.deleteAccount();
      Alert.alert('Account Deleted', 'Your account has been deleted', [
        {
          text: 'OK',
          onPress: () => logout(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to delete account'
      );
    }
    setDeleteDialogVisible(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.name}>
              {user?.name}
            </Text>
            <Text variant="bodyMedium" style={styles.email}>
              {user?.email}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Account Settings" />
          <Divider />
          <List.Item
            title="Edit Profile"
            description="Update your name"
            left={(props) => <List.Icon {...props} icon="account-edit" />}
            onPress={() => {
              setName(user?.name || '');
              setEditDialogVisible(true);
            }}
          />
          <Divider />
          <List.Item
            title="Email"
            description={user?.email}
            left={(props) => <List.Icon {...props} icon="email" />}
            right={(props) => <List.Icon {...props} icon="lock" />}
          />
          <Divider />
          <List.Item
            title="Subscription"
            description={user?.tier?.toUpperCase() || 'FREE'}
            left={(props) => <List.Icon {...props} icon="crown" />}
          />
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Actions" />
          <Divider />
          <List.Item
            title="Logout"
            left={(props) => <List.Icon {...props} icon="logout" />}
            onPress={handleLogout}
          />
          <Divider />
          <List.Item
            title="Delete Account"
            titleStyle={styles.dangerText}
            left={(props) => (
              <List.Icon {...props} icon="delete" color="#d32f2f" />
            )}
            onPress={() => setDeleteDialogVisible(true)}
          />
        </Card>

        <Text variant="bodySmall" style={styles.version}>
          Version 1.0.0
        </Text>
      </View>

      <Portal>
        <Dialog
          visible={editDialogVisible}
          onDismiss={() => setEditDialogVisible(false)}
        >
          <Dialog.Title>Edit Profile</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              disabled={saving}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setEditDialogVisible(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onPress={handleSaveProfile}
              loading={saving}
              disabled={saving}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete your account? This action cannot
              be undone. All your files will be permanently deleted.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleDeleteAccount}
              textColor="#d32f2f"
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    opacity: 0.7,
  },
  dangerText: {
    color: '#d32f2f',
  },
  version: {
    textAlign: 'center',
    opacity: 0.5,
    marginTop: 16,
    marginBottom: 32,
  },
});
