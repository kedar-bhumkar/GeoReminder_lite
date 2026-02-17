import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// This interface matches what expo-location provides in background
interface LocationTaskData {
  locations: Location.LocationObject[];
}

// Store for reminder data that background task can access
// Note: Background tasks run in a separate JS context, so we use a simple approach
let cachedRemindersJson: string | null = null;
let cachedPlacesApiKey: string | null = null;
let cachedOpenAiApiKey: string | null = null;

// Update cached data (call this from foreground when data changes)
export function updateBackgroundTaskData(
  remindersJson: string,
  placesApiKey: string | null,
  openAiApiKey: string | null
) {
  cachedRemindersJson = remindersJson;
  cachedPlacesApiKey = placesApiKey;
  cachedOpenAiApiKey = openAiApiKey;
}

// Define the background task
// IMPORTANT: This must be called at module level, outside of any component
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (!data) {
    return;
  }

  const { locations } = data as LocationTaskData;

  if (!locations || locations.length === 0) {
    return;
  }

  const location = locations[0];
  console.log('Background location update:', location.coords.latitude, location.coords.longitude);

  // For background task, we'll do a simplified check
  // Full LLM matching would be too heavy for background execution
  // Instead, we'll just send a notification that location was tracked
  // The full matching happens when user opens the app

  try {
    // Send a simple notification that we're tracking
    // In a production app, you'd want to do actual matching here
    // But that requires careful handling of API calls in background context

    // For now, just log that background tracking is working
    console.log('Background location tracked at:', new Date().toISOString());

    // If you want to do full matching in background, you'd need to:
    // 1. Make the API calls here (fetch nearby places, run LLM match)
    // 2. Handle the case where APIs might fail
    // 3. Be mindful of battery usage

    // Simple approach: Store location and process when app comes to foreground
    // This is what most location reminder apps do

  } catch (err) {
    console.error('Background task processing error:', err);
  }
});

// Check if background location task is registered
export async function isBackgroundLocationTaskRegistered(): Promise<boolean> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  return isRegistered;
}

// Start background location tracking
export async function startBackgroundLocationTracking(): Promise<boolean> {
  try {
    // Check if already running
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      console.log('Background location tracking already running');
      return true;
    }

    // Request background location permission
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('Foreground location permission denied');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('Background location permission denied');
      return false;
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5 * 60 * 1000, // 5 minutes
      distanceInterval: 100, // 100 meters minimum movement
      deferredUpdatesInterval: 5 * 60 * 1000,
      deferredUpdatesDistance: 100,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'GeoReminder',
        notificationBody: 'Tracking your location for reminders',
        notificationColor: '#BB86FC',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
    });

    console.log('Background location tracking started');
    return true;
  } catch (error) {
    console.error('Failed to start background location tracking:', error);
    return false;
  }
}

// Stop background location tracking
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Background location tracking stopped');
    }
  } catch (error) {
    console.error('Failed to stop background location tracking:', error);
  }
}

// Get background location permission status
export async function getBackgroundLocationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

// Request background location permission
export async function requestBackgroundLocationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  // First need foreground permission
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    return 'denied';
  }

  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}
