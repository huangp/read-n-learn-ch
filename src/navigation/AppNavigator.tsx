import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

import HomeScreen from '../screens/HomeScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import ArticleEditorScreen from '../screens/ArticleEditorScreen';
import CameraScreen from '../screens/CameraScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CharacterBrowseScreen from '../screens/CharacterBrowseScreen';
import DebugDatabaseScreen from '../screens/DebugDatabaseScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTintColor: '#333',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Read & Learn Chinese' }}
        />
        <Stack.Screen
          name="ArticleDetail"
          component={ArticleDetailScreen}
          options={{ title: 'Article' }}
        />
        <Stack.Screen
          name="ArticleEditor"
          component={ArticleEditorScreen}
          options={({ route }) => ({
            title: route.params?.articleId ? 'Edit Article' : 'New Article'
          })}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{
            headerShown: false,
            presentation: 'modal'
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="CharacterBrowser"
          component={CharacterBrowseScreen}
          options={{ title: 'Characters' }}
        />
        <Stack.Screen
          name="DebugDatabase"
          component={DebugDatabaseScreen}
          options={{ title: 'Debug Database' }}
        />
        <Stack.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{ title: 'Subscription' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
