import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { FilesScreen } from '../screens/FilesScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          cardStyle: { flex: 1 },
        }}
      >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Pay Me Drive' }}
      />
      <Stack.Screen
        name="Files"
        component={FilesScreen}
        options={{ title: 'My Files' }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Subscription Plans' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
  },
});
