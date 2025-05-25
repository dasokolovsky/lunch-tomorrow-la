import type { GeocodedAddress } from './addressToCoord';

export interface GeolocationResult {
  lat: number;
  lon: number;
  accuracy?: number;
  source: 'gps' | 'ip' | 'manual';
}

export interface DetectedLocation extends GeolocationResult {
  address?: string;
  display_name?: string;
}

/**
 * Get user's location using browser geolocation API
 */
export function getBrowserLocation(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps'
        });
      },
      (error) => {
        let message = 'Unknown geolocation error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      options
    );
  });
}

/**
 * Get user's approximate location using IP geolocation (fallback)
 */
export async function getIPLocation(): Promise<GeolocationResult> {
  try {
    // Using ipapi.co - free tier allows 1000 requests/day
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error(`IP geolocation failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.latitude || !data.longitude) {
      throw new Error('Invalid IP geolocation response');
    }
    
    return {
      lat: parseFloat(data.latitude),
      lon: parseFloat(data.longitude),
      source: 'ip'
    };
  } catch (error) {
    console.error('IP geolocation failed:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to get address using LocationIQ
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodedAddress | null> {
  const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY;
  if (!apiKey) {
    console.error('Missing LocationIQ API key');
    return null;
  }

  try {
    const url = `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Reverse geocoding failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || !data.display_name) {
      return null;
    }
    
    return {
      lat,
      lon,
      display_name: data.display_name
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Detect user's location with fallbacks
 * 1. Try browser geolocation (most accurate)
 * 2. Fall back to IP geolocation (less accurate)
 * 3. Return null if both fail
 */
export async function detectUserLocation(): Promise<DetectedLocation | null> {
  try {
    // First try browser geolocation
    console.log('Attempting browser geolocation...');
    const browserLocation = await getBrowserLocation();
    
    // Reverse geocode to get address
    const geocoded = await reverseGeocode(browserLocation.lat, browserLocation.lon);
    
    return {
      ...browserLocation,
      address: geocoded?.display_name,
      display_name: geocoded?.display_name
    };
  } catch (browserError) {
    console.log('Browser geolocation failed, trying IP fallback:', browserError.message);
    
    try {
      // Fall back to IP geolocation
      const ipLocation = await getIPLocation();
      
      // Reverse geocode to get address
      const geocoded = await reverseGeocode(ipLocation.lat, ipLocation.lon);
      
      return {
        ...ipLocation,
        address: geocoded?.display_name,
        display_name: geocoded?.display_name
      };
    } catch (ipError) {
      console.log('IP geolocation also failed:', ipError.message);
      return null;
    }
  }
}

/**
 * Parse a full address into components for US addresses
 */
export function parseUSAddress(displayName: string): {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip: string;
} | null {
  try {
    // LocationIQ format is typically: "123 Main St, City, State ZIP, Country"
    const parts = displayName.split(', ');
    
    if (parts.length < 3) {
      return null;
    }
    
    // Extract components (working backwards from the end)
    const country = parts[parts.length - 1];
    const stateZip = parts[parts.length - 2];
    const city = parts[parts.length - 3];
    const addressParts = parts.slice(0, -3);
    
    // Parse state and ZIP from "State ZIP" format
    const stateZipMatch = stateZip.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (!stateZipMatch) {
      return null;
    }
    
    const state = stateZipMatch[1];
    const zip = stateZipMatch[2];
    
    // Join address parts
    const address_line_1 = addressParts.join(', ');
    
    return {
      address_line_1,
      city,
      state,
      zip
    };
  } catch (error) {
    console.error('Error parsing address:', error);
    return null;
  }
}
