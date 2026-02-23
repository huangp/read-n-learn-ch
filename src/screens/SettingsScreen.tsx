import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Switch,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const DEBUG_MODE_KEY = '@debug_mode_enabled';

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    loadDebugMode();
  }, []);

  const loadDebugMode = async () => {
    try {
      const value = await AsyncStorage.getItem(DEBUG_MODE_KEY);
      setDebugMode(value === 'true');
    } catch (error) {
      console.error('Error loading debug mode:', error);
    }
  };

  const toggleDebugMode = async () => {
    try {
      const newValue = !debugMode;
      await AsyncStorage.setItem(DEBUG_MODE_KEY, newValue.toString());
      setDebugMode(newValue);
      console.log(`Debug mode ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error saving debug mode:', error);
    }
  };

  const settingsItems = [
    {
      title: 'About',
      description: 'Read & Learn Chinese v1.0.0',
      onPress: () => {},
    },
    {
      title: 'Data Management',
      description: 'Export/Import articles (coming soon)',
      onPress: () => {},
    },
    {
      title: 'Cloud Sync',
      description: 'Sync across devices (coming soon)',
      onPress: () => {},
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.settingItem,
              index === settingsItems.length - 1 && styles.lastItem,
            ]}
            onPress={item.onPress}
          >
            <View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, { marginTop: 20 }]}>
        <View style={styles.settingItem}>
          <View>
            <Text style={styles.itemTitle}>Debug Mode</Text>
            <Text style={styles.itemDescription}>
              Enable logging for troubleshooting
            </Text>
          </View>
          <Switch
            value={debugMode}
            onValueChange={toggleDebugMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={debugMode ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Built with ❤️ for learning Chinese
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
  },
  chevron: {
    fontSize: 20,
    color: '#999',
  },
  footer: {
    padding: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
});
