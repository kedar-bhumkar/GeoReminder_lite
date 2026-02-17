import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip, TextInput, IconButton, Text, useTheme } from 'react-native-paper';

interface EntityEditorProps {
  entities: string[];
  onChange: (entities: string[]) => void;
  disabled?: boolean;
}

export function EntityEditor({ entities, onChange, disabled = false }: EntityEditorProps) {
  const theme = useTheme();
  const [newEntity, setNewEntity] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleAddEntity = () => {
    const trimmed = newEntity.trim();
    if (trimmed && !entities.includes(trimmed)) {
      onChange([...entities, trimmed]);
      setNewEntity('');
    }
  };

  const handleDeleteEntity = (index: number) => {
    const newEntities = entities.filter((_, i) => i !== index);
    onChange(newEntities);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(entities[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const trimmed = editingValue.trim();
      if (trimmed) {
        const newEntities = [...entities];
        newEntities[editingIndex] = trimmed;
        onChange(newEntities);
      }
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      handleAddEntity();
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={styles.label}>
        Locations
      </Text>

      {/* Entity chips */}
      {entities.length > 0 && (
        <View style={styles.chipScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipContainer}
            nestedScrollEnabled={true}
          >
            {entities.map((entity, index) => (
              <View key={index} style={styles.chipWrapper}>
                {editingIndex === index ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      mode="outlined"
                      dense
                      value={editingValue}
                      onChangeText={setEditingValue}
                      style={styles.editInput}
                      autoFocus
                      onSubmitEditing={handleSaveEdit}
                    />
                    <IconButton
                      icon="check"
                      size={18}
                      onPress={handleSaveEdit}
                      iconColor={theme.colors.primary}
                    />
                    <IconButton
                      icon="close"
                      size={18}
                      onPress={handleCancelEdit}
                      iconColor={theme.colors.error}
                    />
                  </View>
                ) : (
                  <Chip
                    icon="map-marker"
                    mode="flat"
                    style={[styles.chip, { backgroundColor: theme.colors.primaryContainer }]}
                    textStyle={{ color: theme.colors.onPrimaryContainer }}
                    onClose={disabled ? undefined : () => handleDeleteEntity(index)}
                    onPress={disabled ? undefined : () => handleStartEdit(index)}
                    disabled={disabled}
                  >
                    {entity}
                  </Chip>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Add new entity */}
      {!disabled && (
        <View style={styles.addContainer}>
          <TextInput
            mode="outlined"
            dense
            placeholder="Add location (e.g., Target)"
            value={newEntity}
            onChangeText={setNewEntity}
            onSubmitEditing={handleAddEntity}
            onKeyPress={handleKeyPress}
            style={styles.addInput}
            left={<TextInput.Icon icon="plus" />}
          />
          <IconButton
            icon="plus-circle"
            size={24}
            onPress={handleAddEntity}
            disabled={!newEntity.trim()}
            iconColor={theme.colors.primary}
          />
        </View>
      )}

      {entities.length === 0 && !disabled && (
        <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          No locations added. Add manually or let AI extract them from the reminder text.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  label: {
    marginBottom: 8,
  },
  chipScroll: {
    maxHeight: 50,
    width: '100%',
  },
  chipScrollWrapper: {
    maxHeight: 50,
    width: '100%',
    overflow: 'hidden',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    paddingRight: 8,
  },
  chipWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    marginRight: 0,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    width: 120,
    height: 36,
  },
  addContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addInput: {
    flex: 1,
    marginRight: 4,
  },
  hint: {
    marginTop: 4,
    fontStyle: 'italic',
  },
});
