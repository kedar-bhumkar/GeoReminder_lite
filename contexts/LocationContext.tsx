import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  LocationCoordinates,
  PermissionStatus,
  requestLocationPermission,
  getLocationPermissionStatus,
  getCurrentLocation,
} from '../services/locationService';
import {
  LocationTrackingSettings,
  getLocationSettings,
  loadLocationSettings,
  saveLocationSettings,
} from '../services/locationSettings';
import { getLocationInfo, NearbyPlace } from '../services/placesService';
import { findMatchingReminders, MatchResult } from '../services/locationMatcher';
import { useReminders } from './ReminderContext';
import { hasPlacesApiKey } from '../services/placesConfig';
import { hasApiKey } from '../services/config';
import {
  requestNotificationPermissions,
  sendLocationMatchNotification,
  addNotificationResponseListener,
} from '../services/notificationService';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  getBackgroundLocationPermissionStatus,
  requestBackgroundLocationPermission,
} from '../services/backgroundLocationTask';

export interface LocationContextType {
  // State
  isTracking: boolean;
  isBackgroundTracking: boolean;
  lastLocation: LocationCoordinates | null;
  lastCheckTime: Date | null;
  settings: LocationTrackingSettings;
  permissionStatus: PermissionStatus;
  backgroundPermissionStatus: 'granted' | 'denied' | 'undetermined';
  isChecking: boolean;
  error: string | null;

  // Notification state
  currentNotification: MatchResult | null;
  dismissNotification: () => void;

  // Actions
  startTracking: () => Promise<boolean>;
  stopTracking: () => void;
  startBackgroundTracking: () => Promise<boolean>;
  stopBackgroundTracking: () => Promise<void>;
  updateSettings: (settings: Partial<LocationTrackingSettings>) => Promise<void>;
  checkNow: () => Promise<void>;
  requestPermission: () => Promise<PermissionStatus>;
  requestBackgroundPermission: () => Promise<'granted' | 'denied' | 'undetermined'>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const { reminders } = useReminders();

  const [isTracking, setIsTracking] = useState(false);
  const [isBackgroundTracking, setIsBackgroundTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationCoordinates | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [settings, setSettings] = useState<LocationTrackingSettings>({
    enabled: false,
    backgroundEnabled: false,
    intervalMinutes: 5,
    radiusMeters: 152,
  });
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [backgroundPermissionStatus, setBackgroundPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentNotification, setCurrentNotification] = useState<MatchResult | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize settings on mount
  useEffect(() => {
    const init = async () => {
      const loadedSettings = await loadLocationSettings();
      setSettings(loadedSettings);

      const status = await getLocationPermissionStatus();
      setPermissionStatus(status);

      // Check background permission status
      const bgStatus = await getBackgroundLocationPermissionStatus();
      setBackgroundPermissionStatus(bgStatus);

      // Request notification permissions
      await requestNotificationPermissions();

      // Auto-start foreground tracking if enabled and permission granted
      if (loadedSettings.enabled && status === 'granted') {
        setIsTracking(true);
      }

      // Auto-start background tracking if enabled and permission granted
      if (loadedSettings.backgroundEnabled && bgStatus === 'granted') {
        const started = await startBackgroundLocationTracking();
        setIsBackgroundTracking(started);
      }
    };
    init();
  }, []);

  // Listen for notification taps to navigate to reminder
  useEffect(() => {
    const subscription = addNotificationResponseListener((reminderId) => {
      // The snackbar will show the notification details
      // Navigation is handled by the snackbar "View" button
      console.log('Notification tapped for reminder:', reminderId);
    });

    return () => subscription.remove();
  }, []);

  // Location check function
  const performLocationCheck = useCallback(async () => {
    if (isChecking) return;

    // Check prerequisites
    if (!hasPlacesApiKey()) {
      setError('Google Places API key not configured');
      return;
    }

    if (!hasApiKey()) {
      setError('OpenAI API key not configured');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      // Get current location
      const location = await getCurrentLocation();
      setLastLocation(location);
      setLastCheckTime(new Date());

      // Get nearby places and address info
      const locationInfo = await getLocationInfo(
        location.latitude,
        location.longitude,
        settings.radiusMeters
      );

      // Create a combined list of places + address info for matching
      const allPlaces: NearbyPlace[] = [...locationInfo.places];

      // Add street/address as a "place" for matching
      if (locationInfo.street) {
        allPlaces.push({
          name: locationInfo.street,
          displayName: locationInfo.street,
          types: ['route', 'street'],
          vicinity: locationInfo.address,
          placeId: '',
        });
      }
      if (locationInfo.neighborhood) {
        allPlaces.push({
          name: locationInfo.neighborhood,
          displayName: locationInfo.neighborhood,
          types: ['neighborhood'],
          vicinity: locationInfo.address,
          placeId: '',
        });
      }
      if (locationInfo.address) {
        allPlaces.push({
          name: locationInfo.address,
          displayName: locationInfo.address,
          types: ['address'],
          vicinity: locationInfo.address,
          placeId: '',
        });
      }

      if (allPlaces.length === 0) {
        // No places or address found
        return;
      }

      // Find matching reminders
      const matchResult = await findMatchingReminders(allPlaces, reminders);

      if (matchResult.error) {
        console.warn('Location matching warning:', matchResult.error);
      }

      // Show notification for first match
      if (matchResult.matches.length > 0) {
        const match = matchResult.matches[0];

        // Send push notification (appears in system tray)
        await sendLocationMatchNotification(match);

        // Also set in-app notification (snackbar when app is visible)
        setCurrentNotification(match);
      }
    } catch (err) {
      console.error('Location check failed:', err);
      setError(err instanceof Error ? err.message : 'Location check failed');
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, settings.radiusMeters, reminders]);

  // Manage interval timer
  useEffect(() => {
    if (isTracking && settings.enabled && permissionStatus === 'granted') {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Perform initial check
      performLocationCheck();

      // Set up interval
      const intervalMs = settings.intervalMinutes * 60 * 1000;
      intervalRef.current = setInterval(performLocationCheck, intervalMs);
    } else {
      // Stop interval if not tracking
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTracking, settings.enabled, settings.intervalMinutes, permissionStatus, performLocationCheck]);

  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    const status = await requestLocationPermission();
    setPermissionStatus(status);
    return status;
  }, []);

  const startTracking = useCallback(async (): Promise<boolean> => {
    // Check permission first
    let status = permissionStatus;
    if (status !== 'granted') {
      status = await requestPermission();
    }

    if (status !== 'granted') {
      setError('Location permission denied');
      return false;
    }

    // Update settings
    const newSettings = { ...settings, enabled: true };
    await saveLocationSettings(newSettings);
    setSettings(newSettings);
    setIsTracking(true);
    setError(null);

    return true;
  }, [permissionStatus, requestPermission, settings]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    const newSettings = { ...settings, enabled: false };
    saveLocationSettings(newSettings);
    setSettings(newSettings);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [settings]);

  const updateSettings = useCallback(async (newSettings: Partial<LocationTrackingSettings>) => {
    const updated = { ...settings, ...newSettings };
    await saveLocationSettings(updated);
    setSettings(updated);

    // Handle enable/disable
    if (newSettings.enabled !== undefined) {
      if (newSettings.enabled && permissionStatus === 'granted') {
        setIsTracking(true);
      } else if (!newSettings.enabled) {
        setIsTracking(false);
      }
    }
  }, [settings, permissionStatus]);

  const checkNow = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      const status = await requestPermission();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }
    }
    await performLocationCheck();
  }, [permissionStatus, requestPermission, performLocationCheck]);

  const dismissNotification = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  // Start background location tracking
  const handleStartBackgroundTracking = useCallback(async (): Promise<boolean> => {
    // Request background permission first
    const bgStatus = await requestBackgroundLocationPermission();
    setBackgroundPermissionStatus(bgStatus);

    if (bgStatus !== 'granted') {
      setError('Background location permission denied. Please enable "Always allow" in settings.');
      return false;
    }

    const started = await startBackgroundLocationTracking();
    if (started) {
      setIsBackgroundTracking(true);
      const newSettings = { ...settings, backgroundEnabled: true };
      await saveLocationSettings(newSettings);
      setSettings(newSettings);
      setError(null);
      return true;
    } else {
      setError('Failed to start background tracking');
      return false;
    }
  }, [settings]);

  // Stop background location tracking
  const handleStopBackgroundTracking = useCallback(async (): Promise<void> => {
    await stopBackgroundLocationTracking();
    setIsBackgroundTracking(false);
    const newSettings = { ...settings, backgroundEnabled: false };
    await saveLocationSettings(newSettings);
    setSettings(newSettings);
  }, [settings]);

  // Request background permission
  const handleRequestBackgroundPermission = useCallback(async (): Promise<'granted' | 'denied' | 'undetermined'> => {
    const status = await requestBackgroundLocationPermission();
    setBackgroundPermissionStatus(status);
    return status;
  }, []);

  return (
    <LocationContext.Provider
      value={{
        isTracking,
        isBackgroundTracking,
        lastLocation,
        lastCheckTime,
        settings,
        permissionStatus,
        backgroundPermissionStatus,
        isChecking,
        error,
        currentNotification,
        dismissNotification,
        startTracking,
        stopTracking,
        startBackgroundTracking: handleStartBackgroundTracking,
        stopBackgroundTracking: handleStopBackgroundTracking,
        updateSettings,
        checkNow,
        requestPermission,
        requestBackgroundPermission: handleRequestBackgroundPermission,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
