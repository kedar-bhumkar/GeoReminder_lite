import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ReminderProvider } from '../contexts/ReminderContext';
import { LocationProvider } from '../contexts/LocationContext';
import { LocationNotificationSnackbar } from '../components/LocationNotificationSnackbar';
import { darkTheme } from '../theme';
import { loadApiKey } from '../services/config';
import { loadPlacesApiKey } from '../services/placesConfig';
import { loadLocationSettings } from '../services/locationSettings';

// Import background task to register it at app startup
// This must be imported at the top level before any component renders
import '../services/backgroundLocationTask';

export default function RootLayout() {
  // Load API keys and settings from storage on app start
  useEffect(() => {
    loadApiKey();
    loadPlacesApiKey();
    loadLocationSettings();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={darkTheme}>
        <ReminderProvider>
          <LocationProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: darkTheme.colors.surface,
                },
                headerTintColor: darkTheme.colors.onSurface,
                contentStyle: {
                  backgroundColor: darkTheme.colors.background,
                },
              }}
            >
              <Stack.Screen
                name="index"
                options={{
                  title: 'GeoReminder',
                }}
              />
              <Stack.Screen
                name="add"
                options={{
                  title: 'Add Reminder',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="edit/[id]"
                options={{
                  title: 'Edit Reminder',
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  title: 'Settings',
                  presentation: 'modal',
                }}
              />
            </Stack>
            <LocationNotificationSnackbar />
          </LocationProvider>
        </ReminderProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
