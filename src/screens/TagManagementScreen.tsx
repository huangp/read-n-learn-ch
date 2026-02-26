import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import {
  Appbar,
  Text,
  TextInput,
  Button,
  List,
  Dialog,
  Portal,
  Snackbar,
  IconButton,
  TouchableRipple,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CharacterRecognitionService, { Tag } from '../services/characterRecognition';

const TAG_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
  '#5856D6', '#FF2D55', '#5AC8FA', '#FFCC00', '#8E8E93',
];

export default function TagManagementScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTag, setDialogTag] = useState<Tag | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const loadTags = useCallback(async () => {
    const allTags = await CharacterRecognitionService.getAllTags();
    setTags(allTags);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTags();
    }, [loadTags])
  );

  const showError = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      showError('Please enter a tag name');
      return;
    }

    const name = newTagName.trim();
    const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      showError('A tag with this name already exists');
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
      showError('Failed to create tag');
    }
  };

  const confirmDeleteTag = (tag: Tag) => {
    setDialogTag(tag);
    setDialogVisible(true);
  };

  const handleDeleteTag = async () => {
    if (!dialogTag) return;
    
    const success = await CharacterRecognitionService.deleteTag(dialogTag.id);
    if (success) {
      loadTags();
    } else {
      showError('Failed to delete tag');
    }
    setDialogVisible(false);
    setDialogTag(null);
  };

  const renderColorPicker = () => (
    <View style={styles.colorPicker}>
      {TAG_COLORS.map((color) => (
        <TouchableRipple
          key={color}
          style={[
            styles.colorOption,
            { backgroundColor: color },
            selectedColor === color && styles.colorOptionSelected,
          ]}
          onPress={() => setSelectedColor(color)}
        >
          <View style={styles.colorOptionInner} />
        </TouchableRipple>
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
        <Button
          mode="outlined"
          onPress={() => {
            setIsCreating(false);
            setNewTagName('');
            setNewTagDescription('');
            setSelectedColor(TAG_COLORS[0]);
          }}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleCreateTag}
          style={styles.createButton}
          buttonColor="#34C759"
        >
          Create Tag
        </Button>
      </View>
    </View>
  );

  const renderTag = ({ item }: { item: Tag }) => (
    <List.Item
      title={item.name}
      description={item.description}
      left={() => (
        <View style={[styles.tagColor, { backgroundColor: item.color || '#007AFF' }]} />
      )}
      right={() => (
        <IconButton
          icon="delete"
          size={20}
          onPress={() => confirmDeleteTag(item)}
        />
      )}
      style={styles.tagItem}
    />
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Tag Management" />
      </Appbar.Header>
      
      <View style={[styles.content, isTablet && styles.contentTablet]}>
        {!isCreating ? (
          <Button
            mode="contained"
            onPress={() => setIsCreating(true)}
            style={styles.addButton}
            icon="plus"
          >
            Create New Tag
          </Button>
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
      
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Delete Tag</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete "{dialogTag?.name}"? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDeleteTag} textColor="#FF3B30">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
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
    marginBottom: 20,
  },
  createForm: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
  },
  input: {
    marginBottom: 12,
  },
  descriptionInput: {
    height: 80,
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
  colorOptionInner: {
    flex: 1,
    borderRadius: 18,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  createButton: {
    flex: 2,
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
    marginBottom: 4,
  },
  tagColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignSelf: 'center',
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
