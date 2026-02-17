import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appConfig } from '../config/appConfig';

const STORAGE_KEY = 'georeminder_openai_key';
const USE_CUSTOM_KEY_FLAG = 'georeminder_use_custom_key';

// In-memory cache
let cachedApiKey: string | null = null;
let useCustomKey: boolean = false;
let initialized = false;

// Check if we're in a browser environment (not SSR)
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

// Get the effective API key (custom or predefined)
export function getApiKey(): string | null {
  if (useCustomKey && cachedApiKey) {
    return cachedApiKey;
  }
  // Fall back to predefined key if no custom key
  return cachedApiKey || appConfig.openaiApiKey || null;
}

// Get just the custom user key (not the predefined one)
export function getCustomApiKey(): string | null {
  return useCustomKey ? cachedApiKey : null;
}

// Check if using custom key vs predefined
export function isUsingCustomKey(): boolean {
  return useCustomKey && !!cachedApiKey;
}

// Check if predefined key exists
export function hasPredefinedKey(): boolean {
  return !!appConfig.openaiApiKey;
}

// Get predefined key (masked for display)
export function getPredefinedKeyMasked(): string | null {
  if (!appConfig.openaiApiKey) return null;
  return appConfig.openaiApiKey.substring(0, 7) + '••••••••••••••••••••';
}

export async function loadApiKey(): Promise<string | null> {
  if (initialized) {
    return getApiKey();
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
    console.error('Failed to load API key:', error);
  }

  return getApiKey();
}

export async function setApiKey(apiKey: string): Promise<void> {
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
    console.error('Failed to save API key:', error);
    throw error;
  }
}

export async function clearApiKey(): Promise<void> {
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
    console.error('Failed to clear API key:', error);
  }
}

// Switch to using predefined key (clear custom key)
export async function usePredefinedKey(): Promise<void> {
  await clearApiKey();
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}
