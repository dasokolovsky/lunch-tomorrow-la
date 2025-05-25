/**
 * Utility functions for cleaning and displaying addresses to customers
 */

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
 * Convert full state name to two-letter code
 */
function normalizeStateInAddress(stateName: string): string {
  const normalized = stateName.toLowerCase().trim();
  return STATE_NAME_TO_CODE[normalized] || stateName;
}

/**
 * Clean address for customer display by removing country information
 * and normalizing state names to two-letter codes
 */
export function cleanAddressForDisplay(address: string): string {
  if (!address) return '';

  let cleaned = address.trim();

  // Remove "United States" from the end
  cleaned = cleaned.replace(/,\s*United States\s*$/i, '');

  // Remove "USA" from the end
  cleaned = cleaned.replace(/,\s*USA\s*$/i, '');

  // Remove "US" from the end (but be careful not to remove state abbreviations)
  cleaned = cleaned.replace(/,\s*US\s*$/i, '');

  // Normalize state names to two-letter codes
  // Pattern: "City, StateName ZIP" or "Street, City, StateName ZIP"
  cleaned = cleaned.replace(/,\s*([A-Za-z\s]+)\s+(\d{5}(?:-\d{4})?)\s*$/i, (match, statePart, zip) => {
    const normalizedState = normalizeStateInAddress(statePart.trim());
    return `, ${normalizedState} ${zip}`;
  });

  return cleaned.trim();
}

/**
 * Get the best address for customer display
 * Prefers formatted_address over display_name, and cleans both
 */
export function getBestAddressForDisplay(addressData: {
  formatted_address?: string;
  display_name?: string;
  address?: string;
}): string {
  // Try formatted_address first (already clean)
  if (addressData.formatted_address) {
    return addressData.formatted_address;
  }

  // Fall back to display_name and clean it
  if (addressData.display_name) {
    return cleanAddressForDisplay(addressData.display_name);
  }

  // Fall back to address field and clean it
  if (addressData.address) {
    return cleanAddressForDisplay(addressData.address);
  }

  return '';
}
