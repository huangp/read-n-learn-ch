import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Appbar,
  List,
  Switch,
  Divider,
  Text,
  Surface,
} from 'react-native-paper';
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
      <Appbar.Header>
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <Surface style={styles.section}>
        <List.Section>
          {settingsItems.map((item, index) => (
            <React.Fragment key={index}>
              <List.Item
                title={item.title}
                description={item.description}
                onPress={item.onPress}
                right={props => <List.Icon {...props} icon="chevron-right" />}
              />
              {index < settingsItems.length - 1 && <Divider />}
            </React.Fragment>
          ))}
          <Divider />
          <List.Item
            title="Debug Mode"
            description="Enable logging for troubleshooting"
            right={() => (
              <Switch
                value={debugMode}
                onValueChange={toggleDebugMode}
              />
            )}
          />
        </List.Section>
      </Surface>

      <Text variant="bodyMedium" style={styles.footer}>
        Built with ❤️ for learning Chinese
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    margin: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  footer: {
    padding: 40,
    textAlign: 'center',
  },
});
