import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';

interface ArticleMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

export default function ArticleMenu({ onEdit, onDelete }: ArticleMenuProps) {
  return (
    <Menu>
      <MenuTrigger>
        <TouchableOpacity style={styles.trigger}>
          <Text style={styles.triggerText}>⋮</Text>
        </TouchableOpacity>
      </MenuTrigger>
      <MenuOptions customStyles={menuStyles}>
        <MenuOption onSelect={onEdit} text="Edit" />
        <MenuOption onSelect={onDelete}>
          <Text style={styles.deleteOption}>Delete</Text>
        </MenuOption>
      </MenuOptions>
    </Menu>
  );
}

const styles = StyleSheet.create({
  trigger: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: -8, // Align to far right
  },
  triggerText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '600',
  },
  deleteOption: {
    color: '#FF3B30',
    fontSize: 16,
    paddingVertical: 8,
  },
});

const menuStyles = {
  optionsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  optionWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
};