import type { GeocodedAddress } from './addressToCoord';
import type { AddressComponents, FormattedAddress } from './addressFormatter';

export interface StoredAddress extends GeocodedAddress {
  address: string;
  timestamp: number;
  // New formatted address components
  components?: AddressComponents;
  formatted_address?: string;
}

const STORAGE_KEY = 'lunch_tomorrow_address';
const EXPIRY_DAYS = 30; // Address expires after 30 days

export function saveAddress(address: string, geocoded: GeocodedAddress, formattedAddress?: FormattedAddress): void {
  try {
    const stored: StoredAddress = {
      address,
      lat: geocoded.lat,
      lon: geocoded.lon,
      display_name: geocoded.display_name,
      timestamp: Date.now(),
      components: formattedAddress ? {
        address_line_1: formattedAddress.address_line_1,
        address_line_2: formattedAddress.address_line_2,
        city: formattedAddress.city,
        state: formattedAddress.state,
        zip: formattedAddress.zip
      } : undefined,
      formatted_address: formattedAddress?.formatted_address
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error('Failed to save address to localStorage:', error);
  }
}

export function getSavedAddress(): StoredAddress | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed: StoredAddress = JSON.parse(stored);

    // Check if address has expired
    const daysSinceStored = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
    if (daysSinceStored > EXPIRY_DAYS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to retrieve address from localStorage:', error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearSavedAddress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear address from localStorage:', error);
  }
}

/**
 * Migrate existing address to include formatted components
 */
export async function migrateStoredAddress(): Promise<void> {
  try {
    const stored = getSavedAddress();
    if (!stored) {
      console.log('No stored address to migrate');
      return;
    }

    console.log('Migrating stored address:', stored);

    // Force re-migration even if already migrated (for debugging)
    const { parseLocationIQAddress, createFormattedAddress } = await import('./addressFormatter');
    const components = parseLocationIQAddress(stored.display_name || stored.address);

    if (components) {
      const formattedAddress = createFormattedAddress(components, stored.lat, stored.lon);

      // Update the stored address with new format
      const updated: StoredAddress = {
        ...stored,
        components,
        formatted_address: formattedAddress.formatted_address
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('Migrated stored address to new format:', updated);
    } else {
      console.log('Could not parse stored address for migration');
    }
  } catch (error) {
    console.error('Failed to migrate stored address:', error);
  }
}

/**
 * Force clear and re-migrate address (for debugging)
 */
export function debugClearAndMigrate(): void {
  console.log('Clearing stored address for fresh migration');
  clearSavedAddress();
}
