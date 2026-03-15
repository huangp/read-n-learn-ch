import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  Appbar,
  Button,
  Text,
  Surface,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import CharacterRecognitionService from '../services/characterRecognition';

type DebugDatabaseScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DebugDatabase'>;

const QUICK_QUERIES = [
  { label: 'Show Tables', query: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" },
  { label: 'Vocabulary Count', query: 'SELECT COUNT(*) as count FROM vocabulary' },
  { label: 'All Tags', query: 'SELECT * FROM tags ORDER BY name' },
  { label: 'Recent Sessions', query: 'SELECT * FROM reading_sessions ORDER BY started_at DESC LIMIT 10' },
  { label: 'Article Meta', query: 'SELECT * FROM article_meta ORDER BY updated_at DESC LIMIT 10' },
  { label: 'Known Vocab', query: 'SELECT id, familiarity, is_known FROM vocabulary WHERE is_known = 1 ORDER BY familiarity DESC LIMIT 20' },
  { label: 'Examples', query: 'SELECT * FROM example_sentences LIMIT 20' },
  { label: 'Tag Counts', query: `SELECT t.name, COUNT(vt.vocabulary_id) as vocab_count 
FROM tags t 
LEFT JOIN vocabulary_tags vt ON t.name = vt.tag_name 
GROUP BY t.name 
ORDER BY vocab_count DESC` },
];

export default function DebugDatabaseScreen() {
  const navigation = useNavigation<DebugDatabaseScreenNavigationProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const executeQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const result = await CharacterRecognitionService.executeRawQuery(query.trim());
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuery = (queryText: string) => {
    setQuery(queryText);
    setResults(null);
    setError(null);
  };

  const clearAll = () => {
    setQuery('');
    setResults(null);
    setError(null);
  };

  const formatResults = (data: any[]): string => {
    if (!data || data.length === 0) return 'No results';
    return JSON.stringify(data, null, 2);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Debug Database" />
      </Appbar.Header>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Queries:</Text>
          <View style={styles.chipContainer}>
            {QUICK_QUERIES.map((item, index) => (
              <Chip
                key={index}
                onPress={() => handleQuickQuery(item.query)}
                style={styles.chip}
                compact
              >
                {item.label}
              </Chip>
            ))}
          </View>
        </Surface>

        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>SQL Query:</Text>
          <TextInput
            style={styles.queryInput}
            multiline
            numberOfLines={6}
            placeholder="Enter SQL query..."
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={executeQuery}
              loading={loading}
              disabled={loading || !query.trim()}
              style={styles.executeButton}
            >
              Execute
            </Button>
            <Button
              mode="outlined"
              onPress={clearAll}
              disabled={loading}
              style={styles.clearButton}
            >
              Clear
            </Button>
          </View>
        </Surface>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        )}

        {error && (
          <Surface style={[styles.section, styles.errorSection]}>
            <Text style={styles.errorTitle}>Error:</Text>
            <Text style={styles.errorText}>{error}</Text>
          </Surface>
        )}

        {results && !loading && (
          <Surface style={styles.section}>
            <Text style={styles.sectionTitle}>Results ({results.length} rows):</Text>
            <ScrollView horizontal style={styles.resultsScroll}>
              <Text style={styles.resultsText}>{formatResults(results)}</Text>
            </ScrollView>
          </Surface>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  queryInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: '#fafafa',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  executeButton: {
    flex: 2,
  },
  clearButton: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorSection: {
    backgroundColor: '#ffebee',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c62828',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
    fontFamily: 'monospace',
  },
  resultsScroll: {
    maxHeight: 400,
  },
  resultsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
});
