import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Card, Text, Switch, IconButton, Chip, useTheme } from 'react-native-paper';
import { Reminder } from '../types';
import { stringToEntities } from '../services/entityExtractor';

interface ReminderItemProps {
  reminder: Reminder;
  onToggle: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function ReminderItem({ reminder, onToggle, onEdit, onDelete }: ReminderItemProps) {
  const theme = useTheme();
  const entities = stringToEntities(reminder.entity);

  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface },
        !reminder.is_active && styles.inactiveCard,
      ]}
      mode="elevated"
    >
      <Pressable onPress={() => onEdit(reminder.id)} style={styles.pressable}>
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text
              variant="bodyLarge"
              style={[
                styles.reminderText,
                !reminder.is_active && styles.inactiveText,
              ]}
              numberOfLines={2}
            >
              {reminder.text}
            </Text>
            {entities.length > 0 && (
              <View
                style={styles.entityScrollWrapper}
                onStartShouldSetResponder={() => true}
                onStartShouldSetResponderCapture={() => true}
                onMoveShouldSetResponder={() => true}
                onMoveShouldSetResponderCapture={() => true}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  style={styles.entityScroll}
                  contentContainerStyle={styles.entityContainer}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                >
                  {entities.map((entity, index) => (
                    <Chip
                      key={index}
                      icon="map-marker"
                      mode="flat"
                      compact
                      style={[styles.entityChip, { backgroundColor: theme.colors.primaryContainer }]}
                      textStyle={[styles.entityChipText, { color: theme.colors.onPrimaryContainer }]}
                    >
                      {entity}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <View style={styles.actions}>
            <Switch
              value={reminder.is_active}
              onValueChange={() => onToggle(reminder.id)}
              color={theme.colors.primary}
            />
            <IconButton
              icon="delete-outline"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => onDelete(reminder.id)}
            />
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  pressable: {
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  reminderText: {
    marginBottom: 4,
  },
  inactiveText: {
    textDecorationLine: 'line-through',
  },
  entityScrollWrapper: {
    marginTop: 6,
    maxWidth: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  entityScroll: {
    flexGrow: 0,
    width: '100%',
  },
  entityContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    paddingRight: 8,
  },
  entityChip: {
    height: 28,
  },
  entityChipText: {
    fontSize: 12,
    marginVertical: 0,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
