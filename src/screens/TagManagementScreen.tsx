import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CharacterRecognitionService, { Tag } from '../services/characterRecognition';

const TAG_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
  '#5856D6', '#FF2D55', '#5AC8FA', '#FFCC00', '#8E8E93',
];

export default function TagManagementScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const loadTags = useCallback(async () => {
    const allTags = await CharacterRecognitionService.getAllTags();
    setTags(allTags);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTags();
    }, [loadTags])
  );

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    const name = newTagName.trim();
    const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      Alert.alert('Error', 'A tag with this name already exists');
      return;
    }

    const result = await CharacterRecognitionService.createTag(
      name,
      newTagDescription.trim() || undefined,
      selectedColor
    );

    if (result) {
      setNewTagName('');
      setNewTagDescription('');
      setSelectedColor(TAG_COLORS[0]);
      setIsCreating(false);
      loadTags();
    } else {
      Alert.alert('Error', 'Failed to create tag');
    }
  };

  const handleDeleteTag = (tag: Tag) => {
    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete "${tag.name}"? This will remove the tag from all characters.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await CharacterRecognitionService.deleteTag(tag.id);
            if (success) {
              loadTags();
            } else {
              Alert.alert('Error', 'Failed to delete tag');
            }
          },
        },
      ]
    );
  };

  const renderColorPicker = () => (
    <View style={styles.colorPicker}>
      {TAG_COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          style={[
            styles.colorOption,
            { backgroundColor: color },
            selectedColor === color && styles.colorOptionSelected,
          ]}
          onPress={() => setSelectedColor(color)}
        />
      ))}
    </View>
  );

  const renderCreateForm = () => (
    <View style={styles.createForm}>
      <TextInput
        style={styles.input}
        placeholder="Tag name"
        value={newTagName}
        onChangeText={setNewTagName}
        maxLength={50}
        autoFocus
      />
      <TextInput
        style={[styles.input, styles.descriptionInput]}
        placeholder="Description (optional)"
        value={newTagDescription}
        onChangeText={setNewTagDescription}
        maxLength={200}
        multiline
      />
      <Text style={styles.colorLabel}>Select Color:</Text>
      {renderColorPicker()}
      
      <View style={styles.formButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setIsCreating(false);
            setNewTagName('');
            setNewTagDescription('');
            setSelectedColor(TAG_COLORS[0]);
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateTag}
        >
          <Text style={styles.createButtonText}>Create Tag</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTag = ({ item }: { item: Tag }) => (
    <View style={styles.tagItem}>
      <View style={styles.tagInfo}>
        <View style={[styles.tagColor, { backgroundColor: item.color || '#007AFF' }]} />
        <View style={styles.tagTextContainer}>
          <Text style={styles.tagName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.tagDescription}>{item.description}</Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteTag(item)}
      >
        <Text style={styles.deleteButtonText}>🗑</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.content, isTablet && styles.contentTablet]}>
        {!isCreating ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsCreating(true)}
          >
            <Text style={styles.addButtonText}>+ Create New Tag</Text>
          </TouchableOpacity>
        ) : (
          renderCreateForm()
        )}

        <Text style={styles.sectionTitle}>All Tags ({tags.length})</Text>
        
        <FlatList
          data={tags}
          renderItem={renderTag}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tags yet. Create your first tag above!</Text>
            </View>
          }
        />
      </View>
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
  contentTablet: {
    paddingHorizontal: 40,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  createForm: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#333',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 2,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  tagTextContainer: {
    flex: 1,
  },
  tagName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tagDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
