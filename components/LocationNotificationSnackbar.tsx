import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Snackbar, Text, useTheme } from 'react-native-paper';
import { useLocation } from '../contexts/LocationContext';
import { useRouter } from 'expo-router';

export function LocationNotificationSnackbar() {
  const theme = useTheme();
  const router = useRouter();
  const { currentNotification, dismissNotification } = useLocation();

  const handleViewReminder = () => {
    if (currentNotification) {
      dismissNotification();
      router.push(`/edit/${currentNotification.reminderId}`);
    }
  };

  if (!currentNotification) {
    return null;
  }

  return (
    <Snackbar
      visible={!!currentNotification}
      onDismiss={dismissNotification}
      duration={5000}
      action={{
        label: 'View',
        onPress: handleViewReminder,
      }}
      style={[styles.snackbar, { backgroundColor: theme.colors.inverseSurface }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.inverseOnSurface }]}>
          Reminder near {currentNotification.matchedPlace}
        </Text>
        <Text
          style={[styles.text, { color: theme.colors.inverseOnSurface }]}
          numberOfLines={2}
        >
          {currentNotification.reminderText}
        </Text>
      </View>
    </Snackbar>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 2,
  },
  text: {
    fontSize: 14,
  },
});
