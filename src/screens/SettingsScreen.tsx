import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Appbar,
  List,
  Switch,
  Divider,
  Text,
  Surface,
  RadioButton,
  Button,
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';
import { useSubscriptionStore } from '../store/subscriptionStore';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const DEBUG_MODE_KEY = '@debug_mode_enabled';
const DEFAULT_FONT_SIZE_KEY = '@default_font_size';

const FONT_SIZE_OPTIONS = [
  { label: 'Small', value: 14 },
  { label: 'Medium', value: 16 },
  { label: 'Large', value: 18 },
  { label: 'XL', value: 20 },
  { label: 'Huge', value: 22 },
];

export const getDefaultFontSize = async (): Promise<number> => {
  try {
    const value = await AsyncStorage.getItem(DEFAULT_FONT_SIZE_KEY);
    return value ? parseInt(value, 10) : 18;
  } catch (error) {
    console.error('Error loading default font size:', error);
    return 18;
  }
};

export const getLineHeightForFontSize = (fontSize: number): number => {
  return Math.round(fontSize * 1.78);
};

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [debugMode, setDebugMode] = useState(false);
  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    loadDebugMode();
    loadFontSize();
  }, []);

  const loadDebugMode = async () => {
    try {
      const value = await AsyncStorage.getItem(DEBUG_MODE_KEY);
      setDebugMode(value === 'true');
    } catch (error) {
      console.error('Error loading debug mode:', error);
    }
  };

  const loadFontSize = async () => {
    const size = await getDefaultFontSize();
    setFontSize(size);
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

  const clearSubscriptionCache = async () => {
    try {
      // Clear subscription store state
      useSubscriptionStore.setState({
        status: {
          isActive: false,
          isTrial: false,
          willRenew: false,
          hasCloudAccess: false,
        },
        products: [],
        isLoading: false,
        isPurchasing: false,
        lastError: null,
      });
      
      // Clear persisted storage
      await AsyncStorage.removeItem('subscription-storage');
      
      Alert.alert('Cache Cleared', 'Subscription cache has been cleared. Restart the app to reload subscription data.');
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  const handleFontSizeChange = async (newSize: number) => {
    try {
      await AsyncStorage.setItem(DEFAULT_FONT_SIZE_KEY, newSize.toString());
      setFontSize(newSize);
    } catch (error) {
      console.error('Error saving font size:', error);
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

  const lineHeight = getLineHeightForFontSize(fontSize);

  return (
    <ScrollView style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <Surface style={styles.section}>
        <List.Section>
          <List.Item
            title="Default Reading Font Size"
            description="Adjust text size for article reading"
          />
          <View style={styles.fontSizeContainer}>
            {FONT_SIZE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.radioOption}
                onPress={() => handleFontSizeChange(option.value)}
              >
                <RadioButton
                  value={option.value.toString()}
                  status={fontSize === option.value ? 'checked' : 'unchecked'}
                  onPress={() => handleFontSizeChange(option.value)}
                />
                <Text style={styles.radioLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Divider style={styles.previewDivider} />
          
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <Text style={[styles.previewText, { fontSize, lineHeight }]}>
              学习中文是一件很有趣的事情。Reading Chinese can be both challenging and rewarding.
            </Text>
          </View>
          
          <Divider />
          
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
          {debugMode && (
            <>
              <Divider />
              <List.Item
                title="Debug Database"
                description="Query SQLite database directly"
                onPress={() => navigation.navigate('DebugDatabase')}
                right={props => <List.Icon {...props} icon="database" />}
              />
              <Divider />
              <List.Item
                title="Clear Subscription Cache"
                description="Clear RevenueCat and subscription data"
                onPress={clearSubscriptionCache}
                right={props => <List.Icon {...props} icon="delete" />}
              />
            </>
          )}
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
  fontSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  radioOption: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  radioLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  previewDivider: {
    marginHorizontal: 16,
  },
  previewContainer: {
    padding: 16,
    backgroundColor: '#fafafa',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  previewText: {
    color: '#333',
  },
  footer: {
    padding: 40,
    textAlign: 'center',
  },
});
