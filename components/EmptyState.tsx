import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({
  title = 'No reminders yet',
  message = 'Tap the + button to add your first location-based reminder',
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Icon
        source="map-marker-off"
        size={80}
        color={theme.colors.outline}
      />
      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.outline }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    marginTop: 24,
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
  },
});
