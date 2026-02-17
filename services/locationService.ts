import * as Location from 'expo-location';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

// Request foreground location permission
export async function requestLocationPermission(): Promise<PermissionStatus> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status as PermissionStatus;
  } catch (error) {
    console.error('Failed to request location permission:', error);
    return 'denied';
  }
}

// Check current permission status
export async function getLocationPermissionStatus(): Promise<PermissionStatus> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status as PermissionStatus;
  } catch (error) {
    console.error('Failed to get location permission status:', error);
    return 'undetermined';
  }
}

// Get current location
export async function getCurrentLocation(): Promise<LocationCoordinates> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error('Failed to get current location:', error);
    throw error;
  }
}

// Get last known location (faster, may be slightly stale)
export async function getLastKnownLocation(): Promise<LocationCoordinates | null> {
  try {
    const location = await Location.getLastKnownPositionAsync();

    if (!location) {
      return null;
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error('Failed to get last known location:', error);
    return null;
  }
}

// Check if location services are enabled on the device
export async function isLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.error('Failed to check location services:', error);
    return false;
  }
}
