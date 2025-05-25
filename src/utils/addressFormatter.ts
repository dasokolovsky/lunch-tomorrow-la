// US Address formatting and validation utilities

export interface AddressComponents {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface FormattedAddress extends AddressComponents {
  lat: number;
  lon: number;
  formatted_address: string; // The display format: "123 N Main St, Los Angeles, CA 90038"
}

// Valid US state codes
const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

// State name to abbreviation mapping for common cases
const STATE_NAME_TO_CODE: Record<string, string> = {
  'california': 'CA',
  'new york': 'NY',
  'texas': 'TX',
  'florida': 'FL',
  'illinois': 'IL',
  'pennsylvania': 'PA',
  'ohio': 'OH',
  'georgia': 'GA',
  'north carolina': 'NC',
  'michigan': 'MI',
  'new jersey': 'NJ',
  'virginia': 'VA',
  'washington': 'WA',
  'arizona': 'AZ',
  'massachusetts': 'MA',
  'tennessee': 'TN',
  'indiana': 'IN',
  'missouri': 'MO',
  'maryland': 'MD',
  'wisconsin': 'WI',
  'colorado': 'CO',
  'minnesota': 'MN',
  'south carolina': 'SC',
  'alabama': 'AL',
  'louisiana': 'LA',
  'kentucky': 'KY',
  'oregon': 'OR',
  'oklahoma': 'OK',
  'connecticut': 'CT',
  'utah': 'UT',
  'iowa': 'IA',
  'nevada': 'NV',
  'arkansas': 'AR',
  'mississippi': 'MS',
  'kansas': 'KS',
  'new mexico': 'NM',
  'nebraska': 'NE',
  'west virginia': 'WV',
  'idaho': 'ID',
  'hawaii': 'HI',
  'new hampshire': 'NH',
  'maine': 'ME',
  'montana': 'MT',
  'rhode island': 'RI',
  'delaware': 'DE',
  'south dakota': 'SD',
  'north dakota': 'ND',
  'alaska': 'AK',
  'vermont': 'VT',
  'wyoming': 'WY',
  'district of columbia': 'DC'
};

/**
 * Validate if a ZIP code is in valid US format
 */
export function isValidZipCode(zip: string): boolean {
  // 5 digits or 5+4 format
  return /^\d{5}(-\d{4})?$/.test(zip);
}

/**
 * Validate if a state code is valid US state
 */
export function isValidUSState(state: string): boolean {
  return US_STATES.has(state.toUpperCase());
}

/**
 * Convert state name to state code if possible
 */
export function normalizeState(state: string): string {
  const normalized = state.toLowerCase().trim();
  return STATE_NAME_TO_CODE[normalized] || state.toUpperCase();
}

/**
 * Parse LocationIQ display_name into US address components
 * Handles multiple LocationIQ formats:
 * - "123 Main St, City, State ZIP, Country"
 * - "6037, Barton Avenue, Hollywood, Los Angeles, Los Angeles County, California, 90038, United States"
 */
export function parseLocationIQAddress(displayName: string): AddressComponents | null {
  try {
    console.log('Parsing LocationIQ address:', displayName);
    const parts = displayName.split(', ');

    if (parts.length < 4) {
      console.log('Not enough parts:', parts.length);
      return null;
    }

    // Look for ZIP code in the parts (5 digits or 5+4 format)
    let zipIndex = -1;
    let zip = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (/^\d{5}(-\d{4})?$/.test(part)) {
        zipIndex = i;
        zip = part;
        break;
      }
    }

    if (zipIndex === -1) {
      console.log('No ZIP code found');
      return null;
    }

    // Look for state before ZIP
    let state = '';
    let stateIndex = -1;

    // Check the part before ZIP
    if (zipIndex > 0) {
      const beforeZip = parts[zipIndex - 1].trim();
      const normalizedState = normalizeState(beforeZip);
      if (isValidUSState(normalizedState)) {
        state = normalizedState;
        stateIndex = zipIndex - 1;
      }
    }

    // If no state found before ZIP, look for full state names in other parts
    if (!state) {
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        const normalizedState = normalizeState(part);
        if (isValidUSState(normalizedState)) {
          state = normalizedState;
          stateIndex = i;
          break;
        }
      }
    }

    if (!state) {
      console.log('No valid state found');
      return null;
    }

    // Find city - usually before state or between address and state
    let city = '';
    let cityIndex = -1;

    // Look for city before state, skipping neighborhoods and counties
    if (stateIndex > 0) {
      // Work backwards from state to find the actual city
      for (let i = stateIndex - 1; i >= 0; i--) {
        const part = parts[i].trim().toLowerCase();

        // Skip counties
        if (part.includes('county')) {
          continue;
        }

        // Skip common neighborhood/district indicators
        if (part.includes('town') || part.includes('district') || part.includes('village') ||
            part.includes('heights') || part.includes('hills') || part.includes('park') ||
            part.includes('beach') || part.includes('grove') || part.includes('valley') ||
            part.includes('downtown') || part.includes('chinatown') || part.includes('koreatown') ||
            part.includes('little tokyo') || part.includes('arts district') || part.includes('financial district')) {
          continue;
        }

        // This should be the city
        city = parts[i].trim();
        cityIndex = i;
        break;
      }
    }

    if (!city) {
      console.log('No city found');
      return null;
    }

    // Everything before city is address, but filter out neighborhoods
    const addressParts = parts.slice(0, cityIndex).filter(part => {
      const lowerPart = part.trim().toLowerCase();
      // Filter out neighborhood/district names
      return !(lowerPart.includes('town') || lowerPart.includes('district') ||
               lowerPart.includes('village') || lowerPart.includes('heights') ||
               lowerPart.includes('hills') || lowerPart.includes('park') ||
               lowerPart.includes('beach') || lowerPart.includes('grove') ||
               lowerPart.includes('valley') || lowerPart.includes('downtown') ||
               lowerPart.includes('chinatown') || lowerPart.includes('koreatown') ||
               lowerPart.includes('little tokyo') || lowerPart.includes('arts district') ||
               lowerPart.includes('financial district') || lowerPart.includes('east hollywood') ||
               lowerPart.includes('leimert park') || lowerPart.includes('exposition park') ||
               lowerPart.includes('belvedere') || lowerPart.includes('heninger park'));
    });
    let address_line_1 = addressParts.join(' ').trim();

    // Clean up the address - remove leading/trailing commas and extra spaces
    address_line_1 = address_line_1.replace(/^,\s*/, '').replace(/\s*,$/, '').replace(/\s+/g, ' ');

    if (!address_line_1) {
      console.log('No address found');
      return null;
    }

    const result = {
      address_line_1,
      city,
      state,
      zip
    };

    console.log('Parsed address components:', result);
    return result;
  } catch (error) {
    console.error('Error parsing LocationIQ address:', error);
    return null;
  }
}

/**
 * Format address components into standard US format
 * "123 N Main St, Los Angeles, CA 90038"
 */
export function formatUSAddress(components: AddressComponents): string {
  const parts = [components.address_line_1];

  if (components.address_line_2) {
    parts.push(components.address_line_2);
  }

  parts.push(`${components.city}, ${components.state} ${components.zip}`);

  return parts.join(', ');
}

/**
 * Create a FormattedAddress from components and coordinates
 */
export function createFormattedAddress(
  components: AddressComponents,
  lat: number,
  lon: number
): FormattedAddress {
  return {
    ...components,
    lat,
    lon,
    formatted_address: formatUSAddress(components)
  };
}

/**
 * Parse any address string and try to extract US components
 * Handles various formats users might enter
 */
export function parseUserInputAddress(input: string): AddressComponents | null {
  try {
    // Remove extra whitespace and normalize
    const cleaned = input.trim().replace(/\s+/g, ' ');

    // Try to match common US address patterns
    // Pattern: "123 Main St, City, State ZIP"
    const pattern1 = /^(.+?),\s*(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i;
    const match1 = cleaned.match(pattern1);

    if (match1) {
      const [, address_line_1, city, state, zip] = match1;
      const normalizedState = normalizeState(state);

      if (isValidUSState(normalizedState) && isValidZipCode(zip)) {
        return {
          address_line_1: address_line_1.trim(),
          city: city.trim(),
          state: normalizedState,
          zip
        };
      }
    }

    // Pattern: "123 Main St City State ZIP" (no commas)
    const pattern2 = /^(.+?)\s+([A-Za-z\s]+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i;
    const match2 = cleaned.match(pattern2);

    if (match2) {
      const [, addressPart, cityPart, state, zip] = match2;
      const normalizedState = normalizeState(state);

      if (isValidUSState(normalizedState) && isValidZipCode(zip)) {
        // Try to split address and city intelligently
        const words = `${addressPart} ${cityPart}`.split(' ');
        const cityWords = cityPart.split(' ');
        const addressWords = words.slice(0, -cityWords.length);

        return {
          address_line_1: addressWords.join(' ').trim(),
          city: cityWords.join(' ').trim(),
          state: normalizedState,
          zip
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing user input address:', error);
    return null;
  }
}

/**
 * Validate that address components form a valid US address
 */
export function validateUSAddress(components: AddressComponents): boolean {
  return (
    components.address_line_1.trim().length > 0 &&
    components.city.trim().length > 0 &&
    isValidUSState(components.state) &&
    isValidZipCode(components.zip)
  );
}
