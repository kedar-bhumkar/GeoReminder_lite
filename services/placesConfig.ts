import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appConfig } from '../config/appConfig';

const STORAGE_KEY = 'georeminder_places_key';
const USE_CUSTOM_KEY_FLAG = 'georeminder_use_custom_places_key';

// In-memory cache
let cachedApiKey: string | null = null;
let useCustomKey: boolean = false;
let initialized = false;

// Check if we're in a browser environment (not SSR)
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

// Get the effective API key (custom or predefined)
export function getPlacesApiKey(): string | null {
  if (useCustomKey && cachedApiKey) {
    return cachedApiKey;
  }
  // Fall back to predefined key if no custom key
  return cachedApiKey || appConfig.googlePlacesApiKey || null;
}

// Get just the custom user key (not the predefined one)
export function getCustomPlacesApiKey(): string | null {
  return useCustomKey ? cachedApiKey : null;
}

// Check if using custom key vs predefined
export function isUsingCustomPlacesKey(): boolean {
  return useCustomKey && !!cachedApiKey;
}

// Check if predefined key exists
export function hasPredefinedPlacesKey(): boolean {
  return !!appConfig.googlePlacesApiKey;
}

// Get predefined key (masked for display)
export function getPredefinedPlacesKeyMasked(): string | null {
  if (!appConfig.googlePlacesApiKey) return null;
  return appConfig.googlePlacesApiKey.substring(0, 7) + '••••••••••••••••••••';
}

export async function loadPlacesApiKey(): Promise<string | null> {
  if (initialized) {
    return getPlacesApiKey();
  }

  try {
    if (Platform.OS === 'web') {
      if (isBrowser()) {
        cachedApiKey = localStorage.getItem(STORAGE_KEY);
        useCustomKey = localStorage.getItem(USE_CUSTOM_KEY_FLAG) === 'true';
      }
    } else {
      // Native platforms use AsyncStorage
      cachedApiKey = await AsyncStorage.getItem(STORAGE_KEY);
      const customFlag = await AsyncStorage.getItem(USE_CUSTOM_KEY_FLAG);
      useCustomKey = customFlag === 'true';
    }
    initialized = true;
  } catch (error) {
    console.error('Failed to load Places API key:', error);
  }

  return getPlacesApiKey();
}

export async function setPlacesApiKey(apiKey: string): Promise<void> {
  cachedApiKey = apiKey;
  useCustomKey = true;
  initialized = true;

  try {
    if (Platform.OS === 'web') {
      if (isBrowser()) {
        localStorage.setItem(STORAGE_KEY, apiKey);
        localStorage.setItem(USE_CUSTOM_KEY_FLAG, 'true');
      }
    } else {
      // Native platforms use AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, apiKey);
      await AsyncStorage.setItem(USE_CUSTOM_KEY_FLAG, 'true');
    }
  } catch (error) {
    console.error('Failed to save Places API key:', error);
    throw error;
  }
}

export async function clearPlacesApiKey(): Promise<void> {
  cachedApiKey = null;
  useCustomKey = false;

  try {
    if (Platform.OS === 'web') {
      if (isBrowser()) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(USE_CUSTOM_KEY_FLAG);
      }
    } else {
      // Native platforms use AsyncStorage
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(USE_CUSTOM_KEY_FLAG);
    }
  } catch (error) {
    console.error('Failed to clear Places API key:', error);
  }
}

// Switch to using predefined key (clear custom key)
export async function usePredefinedPlacesKey(): Promise<void> {
  await clearPlacesApiKey();
}

export function hasPlacesApiKey(): boolean {
  return !!getPlacesApiKey();
}

// Get the effective API key for background tasks (stored in AsyncStorage)
// This ensures background tasks can access the key even if using predefined
export async function getEffectivePlacesApiKeyForBackground(): Promise<string | null> {
  const key = getPlacesApiKey();
  return key;
}
