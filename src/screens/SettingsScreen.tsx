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
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import * as Updates from 'expo-updates';
import { RootStackParamList } from '../types';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionManager from '../services/subscription/SubscriptionManager';
import { FirstLaunchService } from '../services/firstLaunch';
import { OnboardingModal } from '../components/OnboardingModal';
import { ImportProgressModal } from '../components/ImportProgressModal';
import { exportBackup, exportBackupToCloud, importBackupFromCloud } from '../services/backup';
import type { ImportProgress } from '../services/backup';

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
  const { hasCloudAccess } = useSubscription();
  const [debugMode, setDebugMode] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [exportKeyDialogVisible, setExportKeyDialogVisible] = useState(false);
  const [exportKey, setExportKey] = useState('');
  const [importKeyDialogVisible, setImportKeyDialogVisible] = useState(false);
  const [importKey, setImportKey] = useState('');

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
      
      // Invalidate RevenueCat cache
      await Purchases.invalidateCustomerInfoCache();
      
      Alert.alert('Cache Cleared', 'Subscription cache has been cleared. A new anonymous user ID has been generated. Restart the app to reload subscription data.');
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

  const handleExport = async () => {
    if (!hasCloudAccess) {
      Alert.alert(
        'Subscription Required',
        'Cloud backup is a premium feature. Subscribe to back up your data across devices.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Subscribe', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }

    setExportKey('');
    setExportKeyDialogVisible(true);
  };

  const performExport = async () => {
    setExportKeyDialogVisible(false);

    try {
      const key = exportKey.trim() || undefined;
      await exportBackupToCloud(key);
      Alert.alert('Success', 'Your data has been exported to the cloud.');
    } catch (error) {
      console.error('[Settings] Cloud export failed:', error);
      Alert.alert('Export Failed', 'Could not export to cloud. Please try again.');
    }
  };

  const handleImport = async () => {
    if (!hasCloudAccess) {
      Alert.alert(
        'Subscription Required',
        'Cloud restore is a premium feature. Subscribe to restore your data across devices.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Subscribe', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }

    setImportKey('');
    setImportKeyDialogVisible(true);
  };

  const performImport = async () => {
    setImportKeyDialogVisible(false);

    Alert.alert(
      'Restore from Cloud',
      'This will replace ALL your local data with the cloud backup. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setImportModalVisible(true);
            setImportProgress(null);

            try {
              const key = importKey.trim() || undefined;
              await importBackupFromCloud(key, (progress) => {
                setImportProgress(progress);
              });
            } catch (error) {
              setImportModalVisible(false);
              console.error('[Settings] Cloud import failed:', error);
              Alert.alert('Import Failed', error instanceof Error ? error.message : 'Could not import from cloud. Please try again.');
            }
          },
        },
      ]
    );
  };

  const settingsItems = [
    {
      title: 'About',
      description: 'Read & Learn Chinese v1.0.0',
      onPress: () => setAboutVisible(true),
    },
    {
      title: 'Data Export (Premium)',
      description: hasCloudAccess ? 'Export all articles and progress to cloud' : 'Sync across devices (Premium)',
      onPress: handleExport,
    },
    {
      title: 'Data Import (Premium)',
      description: hasCloudAccess ? 'Restore all articles and progress from cloud' : 'Restore from cloud (Premium)',
      onPress: handleImport,
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
            title="Show Tutorial"
            description="View the app tutorial again"
            onPress={() => setShowOnboarding(true)}
            right={props => <List.Icon {...props} icon="school" />}
          />
          {__DEV__ && (
            <>
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
                  <Divider />
                  <List.Item
                    title="Create New Test User"
                    description="Log out and create new anonymous user (unsubscribed)"
                    onPress={async () => {
                      try {
                        const success = await SubscriptionManager.logOut();
                        if (success) {
                          Alert.alert(
                            'New Test User Created',
                            'A new anonymous user has been created. Please restart the app to see the unsubscribed state.'
                          );
                        } else {
                          Alert.alert(
                            'Already Anonymous',
                            'Current user is already anonymous. To test unsubscribed state, you need to:\n\n1. Purchase a subscription first\n2. Then create a new test user\n\nOr wait for the current sandbox subscription to expire.'
                          );
                        }
                      } catch (error) {
                        console.error('Error creating new test user:', error);
                        Alert.alert('Error', 'Failed to create new test user');
                      }
                    }}
                    right={props => <List.Icon {...props} icon="account-switch" />}
                  />
                  <Divider />
                  <List.Item
                    title="Reset Onboarding"
                    description="Show onboarding tutorial on next app launch"
                    onPress={async () => {
                      try {
                        await FirstLaunchService.resetOnboarding();
                        Alert.alert(
                          'Onboarding Reset',
                          'The onboarding tutorial will be shown the next time you open the Home screen.'
                        );
                      } catch (error) {
                        console.error('Error resetting onboarding:', error);
                        Alert.alert('Error', 'Failed to reset onboarding');
                      }
                    }}
                    right={props => <List.Icon {...props} icon="replay" />}
                  />
                </>
              )}
            </>
          )}
        </List.Section>
      </Surface>

      <Text variant="bodyMedium" style={styles.footer}>
        For Amelia and Jayden, built with ❤️ for learning Chinese. 嘟嘟皮皮加油！
      </Text>

      <Portal>
        <Dialog visible={aboutVisible} onDismiss={() => setAboutVisible(false)}>
          <Dialog.Title>About Read & Learn Chinese</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={styles.dialogScrollContent}>
              <Text variant="bodyMedium" style={styles.aboutText}>
                Read & Learn Chinese is your personal Chinese reading companion. 
                Import articles, tap on words to see definitions, and track your 
                learning progress.
              </Text>
              <Text variant="titleSmall" style={styles.featuresTitle}>Key Features:</Text>
              <Text variant="bodyMedium" style={styles.featureItem}>• Import articles from text or camera</Text>
              <Text variant="bodyMedium" style={styles.featureItem}>• Tap-to-lookup dictionary with 100K+ entries</Text>
              <Text variant="bodyMedium" style={styles.featureItem}>• HSK level tracking and vocabulary management</Text>
              <Text variant="bodyMedium" style={styles.featureItem}>• Reading progress and statistics</Text>
              <Text variant="bodyMedium" style={styles.featureItem}>• Cloud lookup and sync for subscribed user</Text>

              <Divider style={styles.aboutDivider} />

              <Text variant="titleSmall" style={styles.featuresTitle}>Data Sources:</Text>
              <Text variant="bodyMedium" style={styles.featureItem}>• Dictionary: CC-CEDICT (offline)</Text>
              <Text variant="bodyMedium" style={styles.featureItem}>• Examples: Tatoeba.org (CC BY 2.0 FR)</Text>
              <Text variant="bodyMedium" style={styles.featureItem}>• Cloud lookup: Powered by AI</Text>
              
              <Divider style={styles.aboutDivider} />
              
              <Text variant="titleSmall" style={styles.learningTitle}>Chinese Character Coverage</Text>
              <Text variant="bodyMedium" style={styles.aboutText}>
                Chinese characters (Hanzi) have a very high 'recurrence rate,' meaning a small group of 'core characters' accounts for the vast majority of what you'll see in writing. Based on data from the Table of Common Characters in Modern Chinese, here is the breakdown:
              </Text>
              
              <Text variant="bodyMedium" style={styles.coverageItem}>
                <Text style={styles.bold}>Top 600 Characters:</Text> Cover about 75% of written content. This aligns with what you read! At this level, you can grasp the gist of simple signs or text messages.
              </Text>
              
              <Text variant="bodyMedium" style={styles.coverageItem}>
                <Text style={styles.bold}>Top 1,000 Characters:</Text> Cover about 90%. You can now read most colloquial articles and everyday conversations.
              </Text>
              
              <Text variant="bodyMedium" style={styles.coverageItem}>
                <Text style={styles.bold}>Top 2,500 Characters:</Text> Cover about 98%. This is the standard for a primary school graduate in China. You can read newspapers, magazines, and websites without much trouble.
              </Text>
              
              <Text variant="bodyMedium" style={styles.coverageItem}>
                <Text style={styles.bold}>Top 3,500 Characters:</Text> Cover about 99.5%. This is the full list of 'common' characters. Once you hit this, you're functionally literate and rarely need a dictionary for novels or professional docs.
              </Text>
              
              <Text variant="titleSmall" style={styles.learningTitle}>Why does 75% coverage still feel 'not enough'?</Text>
              <Text variant="bodyMedium" style={styles.aboutText}>
                Even if you know 75% of the characters, the remaining 25% usually contain the keywords (specific nouns or verbs). For example:
              </Text>
              <Text variant="bodyMedium" style={styles.exampleText}>
                'Yesterday I [?] to the [?], it was very [?].'
              </Text>
              <Text variant="bodyMedium" style={styles.aboutText}>
                Even if you know 80% of the sentence, if you don't know the [?] words, you still won't know what actually happened!
              </Text>
              
              <Text variant="titleSmall" style={styles.learningTitle}>My Advice for Learning</Text>
              
              <Text variant="bodyMedium" style={styles.adviceItem}>
                <Text style={styles.bold}>Set Milestone Goals:</Text> If you're a beginner, focus on the core vocabulary for HSK levels 1–4 first.
              </Text>
              
              <Text variant="bodyMedium" style={styles.adviceItem}>
                <Text style={styles.bold}>Learn Words, Not Just Characters:</Text> Modern Chinese is mostly made of two-character words. Knowing 'Fire' (火) and 'Vehicle' (车) is great, but you need to learn them together as 'Train' (火车). Always learn characters in the context of words.
              </Text>
              
              <Text variant="bodyMedium" style={styles.adviceItem}>
                <Text style={styles.bold}>Read Graded Readers:</Text> Once you know about 1,000 characters, stop memorizing lists and start reading Graded Readers. They use a controlled vocabulary to help you practice in a real story context.
              </Text>
              
              <Text variant="bodySmall" style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setAboutVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <OnboardingModal
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
      <ImportProgressModal
        visible={importModalVisible}
        progress={importProgress}
        onDone={() => {
          setImportModalVisible(false);
          // Reload the app to pick up restored data
          if (!__DEV__) {
            Updates.reloadAsync();
          }
        }}
      />

      {/* Export Key Dialog */}
      <Portal>
        <Dialog visible={exportKeyDialogVisible} onDismiss={() => setExportKeyDialogVisible(false)}>
          <Dialog.Title>Export to Cloud</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              Enter a custom key (must be unique, such as your email) to identify this backup. Use the same key on another device to restore your data.
            </Text>
            <Text variant="bodySmall" style={{ marginBottom: 16, color: '#666' }}>
              Leave empty to use your account ID (can only restore on the same account).
            </Text>
            <TextInput
              label="Backup Key (optional)"
              value={exportKey}
              onChangeText={setExportKey}
              placeholder="Enter a custom key"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExportKeyDialogVisible(false)}>Cancel</Button>
            <Button onPress={performExport} mode="contained">Export</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Import Key Dialog */}
      <Portal>
        <Dialog visible={importKeyDialogVisible} onDismiss={() => setImportKeyDialogVisible(false)}>
          <Dialog.Title>Restore from Cloud</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              Enter the key used when exporting the backup.
            </Text>
            <Text variant="bodySmall" style={{ marginBottom: 16, color: '#666' }}>
              Leave empty to restore from your account ID (same account only).
            </Text>
            <TextInput
              label="Backup Key (optional)"
              value={importKey}
              onChangeText={setImportKey}
              placeholder="Enter the backup key"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setImportKeyDialogVisible(false)}>Cancel</Button>
            <Button onPress={performImport} mode="contained">Next</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  aboutText: {
    marginBottom: 16,
    lineHeight: 22,
  },
  featuresTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '600',
  },
  featureItem: {
    marginBottom: 4,
    lineHeight: 20,
  },
  versionText: {
    marginTop: 24,
    textAlign: 'center',
    color: '#666',
  },
  dialogScrollContent: {
    paddingVertical: 8,
  },
  aboutDivider: {
    marginVertical: 16,
  },
  learningTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  coverageItem: {
    marginBottom: 12,
    lineHeight: 22,
  },
  exampleText: {
    marginVertical: 12,
    fontStyle: 'italic',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    lineHeight: 22,
  },
  adviceItem: {
    marginBottom: 12,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
  },
});
