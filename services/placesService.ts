import { getPlacesApiKey } from './placesConfig';

export interface NearbyPlace {
  name: string;
  displayName: string;
  types: string[];
  vicinity: string;
  placeId: string;
}

export interface NearbyPlacesResult {
  places: NearbyPlace[];
  status: 'OK' | 'ZERO_RESULTS' | 'ERROR' | 'NO_API_KEY';
  error?: string;
}

// New Places API (v1) endpoint
const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';

// Fetch nearby places from Google Places API (New)
export async function getNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number = 152 // 500 feet default
): Promise<NearbyPlacesResult> {
  const apiKey = getPlacesApiKey();

  if (!apiKey) {
    return {
      places: [],
      status: 'NO_API_KEY',
      error: 'No Google Places API key configured',
    };
  }

  try {
    // New Places API uses POST with JSON body
    // No includedTypes filter = returns all place types including addresses
    const requestBody = {
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: {
            latitude,
            longitude,
          },
          radius: radiusMeters,
        },
      },
    };

    const response = await fetch(PLACES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.formattedAddress,places.shortFormattedAddress',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      return {
        places: [],
        status: 'ERROR',
        error: data.error.message || 'API error',
      };
    }

    // New API returns { places: [...] } or empty object if no results
    if (!data.places || data.places.length === 0) {
      return {
        places: [],
        status: 'ZERO_RESULTS',
      };
    }

    const places: NearbyPlace[] = data.places.map((place: any) => ({
      name: place.displayName?.text || '',
      displayName: place.displayName?.text || '',
      types: place.types || [],
      vicinity: place.shortFormattedAddress || place.formattedAddress || '',
      placeId: place.id || '',
    }));

    return {
      places,
      status: 'OK',
    };
  } catch (error) {
    console.error('Failed to fetch nearby places:', error);
    return {
      places: [],
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Get place names as a simple array (for matching)
export async function getNearbyPlaceNames(
  latitude: number,
  longitude: number,
  radiusMeters: number = 152
): Promise<string[]> {
  const result = await getNearbyPlaces(latitude, longitude, radiusMeters);

  if (result.status === 'OK') {
    return result.places.map(place => place.displayName).filter(name => name.length > 0);
  }

  return [];
}

// Reverse geocode to get street address from coordinates
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ address: string; street: string; neighborhood: string } | null> {
  const apiKey = getPlacesApiKey();

  if (!apiKey) {
    return null;
  }

  try {
    // Use Google Geocoding API for reverse geocoding
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

    return null;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

// Get all location info (places + address) for matching
export async function getLocationInfo(
  latitude: number,
  longitude: number,
  radiusMeters: number = 152
): Promise<{ places: NearbyPlace[]; address: string; street: string; neighborhood: string }> {
  // Fetch places and address in parallel
  const [placesResult, geocodeResult] = await Promise.all([
    getNearbyPlaces(latitude, longitude, radiusMeters),
    reverseGeocode(latitude, longitude),
  ]);

  return {
    places: placesResult.status === 'OK' ? placesResult.places : [],
    address: geocodeResult?.address || '',
    street: geocodeResult?.street || '',
    neighborhood: geocodeResult?.neighborhood || '',
  };
}

// Filter places by type (e.g., 'restaurant', 'store', 'pharmacy')
export function filterPlacesByType(places: NearbyPlace[], types: string[]): NearbyPlace[] {
  const typeSet = new Set(types.map(t => t.toLowerCase()));
  return places.filter(place =>
    place.types.some(type => typeSet.has(type.toLowerCase()))
  );
}

// Get business-type places (excluding roads, routes, etc.)
export function getBusinessPlaces(places: NearbyPlace[]): NearbyPlace[] {
  const nonBusinessTypes = new Set([
    'route',
    'street_address',
    'premise',
    'subpremise',
    'natural_feature',
    'political',
    'locality',
    'neighborhood',
    'postal_code',
  ]);

  return places.filter(place =>
    !place.types.every(type => nonBusinessTypes.has(type))
  );
}
