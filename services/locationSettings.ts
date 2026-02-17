import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appConfig } from '../config/appConfig';

const STORAGE_KEY = 'georeminder_location_settings';

export interface LocationTrackingSettings {
  enabled: boolean;
  backgroundEnabled: boolean;  // Continue tracking when app is closed
  intervalMinutes: number;
  radiusMeters: number;
}

// Default settings
export const DEFAULT_LOCATION_SETTINGS: LocationTrackingSettings = {
  enabled: false,
  backgroundEnabled: false,
  intervalMinutes: appConfig.locationCheckIntervalMinutes || 5,
  radiusMeters: appConfig.locationRadiusMeters || 152, // 500 feet
};

// In-memory cache
let cachedSettings: LocationTrackingSettings = { ...DEFAULT_LOCATION_SETTINGS };
let initialized = false;

// Check if we're in a browser environment (not SSR)
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function getLocationSettings(): LocationTrackingSettings {
  return { ...cachedSettings };
}

export async function loadLocationSettings(): Promise<LocationTrackingSettings> {
  if (initialized) {
    return getLocationSettings();
  }

  try {
    let storedData: string | null = null;

    if (Platform.OS === 'web') {
      if (isBrowser()) {
        storedData = localStorage.getItem(STORAGE_KEY);
      }
    } else {
      storedData = await AsyncStorage.getItem(STORAGE_KEY);
    }

    if (storedData) {
      const parsed = JSON.parse(storedData);
      cachedSettings = {
        ...DEFAULT_LOCATION_SETTINGS,
        ...parsed,
      };
    }
    initialized = true;
  } catch (error) {
    console.error('Failed to load location settings:', error);
  }

  return getLocationSettings();
}

export async function saveLocationSettings(settings: LocationTrackingSettings): Promise<void> {
  cachedSettings = { ...settings };
  initialized = true;

  try {
    const data = JSON.stringify(settings);

    if (Platform.OS === 'web') {
      if (isBrowser()) {
        localStorage.setItem(STORAGE_KEY, data);
      }
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, data);
    }
  } catch (error) {
    console.error('Failed to save location settings:', error);
    throw error;
  }
}

export async function updateLocationSetting<K extends keyof LocationTrackingSettings>(
  key: K,
  value: LocationTrackingSettings[K]
): Promise<void> {
  const newSettings = { ...cachedSettings, [key]: value };
  await saveLocationSettings(newSettings);
}

export async function resetLocationSettings(): Promise<void> {
  await saveLocationSettings({ ...DEFAULT_LOCATION_SETTINGS });
}
