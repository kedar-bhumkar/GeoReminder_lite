import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Storage keys for background task data
const BACKGROUND_REMINDERS_KEY = 'georeminder_bg_reminders';
const BACKGROUND_PLACES_KEY = 'georeminder_bg_places_key';
const BACKGROUND_RADIUS_KEY = 'georeminder_bg_radius';
const LAST_NOTIFICATION_KEY = 'georeminder_last_notification';

// This interface matches what expo-location provides in background
interface LocationTaskData {
  locations: Location.LocationObject[];
}

// Simplified reminder interface for background task
interface BackgroundReminder {
  id: number;
  text: string;
  entity: string | null;
  is_active: boolean;
}

// Match result for notifications
interface BackgroundMatchResult {
  reminderId: number;
  reminderText: string;
  matchedEntity: string;
  matchedPlace: string;
}

// Parse entity string to array
function stringToEntities(entityString: string | null): string[] {
  if (!entityString) return [];
  return entityString.split(';').map(e => e.trim()).filter(e => e.length > 0);
}

// Simple string-based matching (no LLM needed for background)
function findMatchingRemindersSimple(
  placeNames: string[],
  reminders: BackgroundReminder[]
): BackgroundMatchResult[] {
  const activeReminders = reminders.filter(r => r.is_active && r.entity);
  const matches: BackgroundMatchResult[] = [];
  const normalizedPlaces = placeNames.map(p => p.toLowerCase());
  const matchedReminderIds = new Set<number>();

  for (const reminder of activeReminders) {
    if (matchedReminderIds.has(reminder.id)) continue;

    const entities = stringToEntities(reminder.entity);

    for (const entity of entities) {
      const normalizedEntity = entity.toLowerCase();
      let found = false;

      for (let i = 0; i < normalizedPlaces.length; i++) {
        const placeName = normalizedPlaces[i];

        // Check if place contains entity or vice versa
        if (placeName.includes(normalizedEntity) || normalizedEntity.includes(placeName)) {
          matches.push({
            reminderId: reminder.id,
            reminderText: reminder.text,
            matchedEntity: entity,
            matchedPlace: placeNames[i],
          });
          matchedReminderIds.add(reminder.id);
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  return matches;
}

// Fetch nearby places from Google Places API
async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  apiKey: string,
  radiusMeters: number
): Promise<string[]> {
  try {
    const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';

    const requestBody = {
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: radiusMeters,
        },
      },
    };

    const response = await fetch(PLACES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Background: Places API error:', data.error.message);
      return [];
    }

    if (!data.places || data.places.length === 0) {
      return [];
    }

    return data.places
      .map((place: any) => place.displayName?.text || '')
      .filter((name: string) => name.length > 0);
  } catch (error) {
    console.error('Background: Failed to fetch places:', error);
    return [];
  }
}

// Reverse geocode to get street/address
async function reverseGeocode(
  latitude: number,
  longitude: number,
  apiKey: string
): Promise<{ address: string; street: string; neighborhood: string }> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const components = result.address_components || [];

      let street = '';
      let neighborhood = '';

      for (const component of components) {
        if (component.types.includes('route')) {
          street = component.long_name;
        }
        if (component.types.includes('neighborhood') || component.types.includes('sublocality')) {
          neighborhood = component.long_name;
        }
      }

      return {
        address: result.formatted_address || '',
        street,
        neighborhood,
      };
    }

    return { address: '', street: '', neighborhood: '' };
  } catch (error) {
    console.error('Background: Reverse geocoding failed:', error);
    return { address: '', street: '', neighborhood: '' };
  }
}

// Ensure notification channel exists (for Android)
async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('location-reminders', {
      name: 'Location Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#BB86FC',
      sound: 'default',
    });
  }
}

// Send notification for a match
async function sendBackgroundNotification(match: BackgroundMatchResult): Promise<void> {
  try {
    // Ensure channel exists before sending
    await ensureNotificationChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Near ${match.matchedPlace}`,
        body: match.reminderText,
        data: {
          reminderId: match.reminderId,
          matchedPlace: match.matchedPlace,
          matchedEntity: match.matchedEntity,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId: 'location-reminders' }),
      },
      trigger: null, // Immediate
    });
    console.log('Background: Notification sent for:', match.matchedPlace);
  } catch (error) {
    console.error('Background: Failed to send notification:', error);
  }
}

// Check if we recently sent a notification for this reminder (debounce)
async function shouldSendNotification(reminderId: number): Promise<boolean> {
  try {
    const lastNotificationData = await AsyncStorage.getItem(LAST_NOTIFICATION_KEY);
    if (!lastNotificationData) return true;

    const lastNotifications = JSON.parse(lastNotificationData) as Record<string, number>;
    const lastTime = lastNotifications[reminderId.toString()];

    if (!lastTime) return true;

    // Don't send notification if we sent one for this reminder in the last 1 minutes
    const thirtyMinutes = 1 * 60 * 1000;
    return Date.now() - lastTime > thirtyMinutes;
  } catch {
    return true;
  }
}

// Record that we sent a notification for this reminder
async function recordNotification(reminderId: number): Promise<void> {
  try {
    let lastNotifications: Record<string, number> = {};
    const data = await AsyncStorage.getItem(LAST_NOTIFICATION_KEY);
    if (data) {
      lastNotifications = JSON.parse(data);
    }

    lastNotifications[reminderId.toString()] = Date.now();

    // Clean up old entries (older than 1 hour)
    const oneHour = 1 * 60 * 1000;
    const now = Date.now();
    for (const key of Object.keys(lastNotifications)) {
      if (now - lastNotifications[key] > oneHour) {
        delete lastNotifications[key];
      }
    }

    await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, JSON.stringify(lastNotifications));
  } catch (error) {
    console.error('Background: Failed to record notification:', error);
  }
}

// Define the background task
// IMPORTANT: This must be called at module level, outside of any component
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  console.log('Background: Task triggered');

  if (error) {
    console.error('Background: Location task error:', error);
    return;
  }

  if (!data) {
    console.log('Background: No data received');
    return;
  }

  const { locations } = data as LocationTaskData;

  if (!locations || locations.length === 0) {
    console.log('Background: No locations in data');
    return;
  }

  const location = locations[0];
  const { latitude, longitude } = location.coords;
  console.log('Background: Location update:', latitude, longitude);

  try {
    // Read data from AsyncStorage (background tasks can't access React context or module state)
    const [remindersJson, placesApiKey, radiusStr] = await Promise.all([
      AsyncStorage.getItem(BACKGROUND_REMINDERS_KEY),
      AsyncStorage.getItem(BACKGROUND_PLACES_KEY),
      AsyncStorage.getItem(BACKGROUND_RADIUS_KEY),
    ]);

    console.log('Background: Data loaded - reminders:', !!remindersJson, 'apiKey:', !!placesApiKey);

    if (!placesApiKey) {
      console.log('Background: No Places API key in AsyncStorage');
      return;
    }

    if (!remindersJson) {
      console.log('Background: No reminders in AsyncStorage');
      return;
    }

    const reminders: BackgroundReminder[] = JSON.parse(remindersJson);
    const activeReminders = reminders.filter(r => r.is_active && r.entity);

    console.log('Background: Total reminders:', reminders.length, 'Active with entities:', activeReminders.length);

    if (activeReminders.length === 0) {
      console.log('Background: No active reminders with entities');
      return;
    }

    const radiusMeters = radiusStr ? parseInt(radiusStr, 10) : 152;

    // Fetch nearby places and address info in parallel
    console.log('Background: Fetching places with radius:', radiusMeters);
    const [placeNames, geocodeResult] = await Promise.all([
      fetchNearbyPlaces(latitude, longitude, placesApiKey, radiusMeters),
      reverseGeocode(latitude, longitude, placesApiKey),
    ]);

    // Combine place names with address info for matching
    const allNames = [...placeNames];
    if (geocodeResult.street) {
      allNames.push(geocodeResult.street);
    }
    if (geocodeResult.neighborhood) {
      allNames.push(geocodeResult.neighborhood);
    }
    if (geocodeResult.address) {
      allNames.push(geocodeResult.address);
    }

    console.log('Background: Found places:', allNames.length, allNames.slice(0, 3));

    if (allNames.length === 0) {
      console.log('Background: No places found near location');
      return;
    }

    // Find matching reminders
    const matches = findMatchingRemindersSimple(allNames, reminders);

    console.log('Background: Found matches:', matches.length);

    // Send notifications for matches (with debouncing)
    for (const match of matches) {
      const shouldSend = await shouldSendNotification(match.reminderId);
      console.log('Background: Should send for reminder', match.reminderId, ':', shouldSend);
      if (shouldSend) {
        await sendBackgroundNotification(match);
        await recordNotification(match.reminderId);
      }
    }

  } catch (err) {
    console.error('Background: Task processing error:', err);
  }
});

// Sync data to AsyncStorage for background task to use
export async function syncBackgroundTaskData(
  reminders: BackgroundReminder[],
  placesApiKey: string | null,
  radiusMeters: number
): Promise<void> {
  try {
    if (!placesApiKey) {
      console.warn('syncBackgroundTaskData: No API key provided');
    }

    await Promise.all([
      AsyncStorage.setItem(BACKGROUND_REMINDERS_KEY, JSON.stringify(reminders)),
      placesApiKey
        ? AsyncStorage.setItem(BACKGROUND_PLACES_KEY, placesApiKey)
        : AsyncStorage.removeItem(BACKGROUND_PLACES_KEY),
      AsyncStorage.setItem(BACKGROUND_RADIUS_KEY, radiusMeters.toString()),
    ]);
    console.log('Background task data synced - reminders:', reminders.length, 'apiKey:', !!placesApiKey);
  } catch (error) {
    console.error('Failed to sync background task data:', error);
  }
}

// Sync only reminders (call this when reminders change)
export async function syncRemindersForBackground(reminders: BackgroundReminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(BACKGROUND_REMINDERS_KEY, JSON.stringify(reminders));
    console.log('Reminders synced for background task:', reminders.length);
  } catch (error) {
    console.error('Failed to sync reminders for background:', error);
  }
}

// Check if background location task is registered
export async function isBackgroundLocationTaskRegistered(): Promise<boolean> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  return isRegistered;
}

// Send a test notification to verify notifications work
export async function sendTestNotification(): Promise<void> {
  try {
    await ensureNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Background Tracking Started',
        body: 'GeoReminder is now tracking your location in the background',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId: 'location-reminders' }),
      },
      trigger: null,
    });
    console.log('Test notification sent');
  } catch (error) {
    console.error('Failed to send test notification:', error);
  }
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

    // Ensure notification channel exists before starting
    await ensureNotificationChannel();

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 0.5 * 60 * 1000, // 0.5 minutes
      distanceInterval: 100, // 100 meters minimum movement
      deferredUpdatesInterval: 0.5 * 60 * 1000,
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
