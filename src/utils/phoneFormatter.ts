/**
 * Phone number formatting utilities for US phone numbers
 */

/**
 * Format a phone number as user types (e.g., "(555) 123-4567")
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits for US numbers
  const limitedDigits = digits.slice(0, 10);
  
  // Format based on length
  if (limitedDigits.length === 0) return '';
  if (limitedDigits.length <= 3) return `(${limitedDigits}`;
  if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  }
  return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
}

/**
 * Convert formatted phone number to E.164 format for Supabase (+1XXXXXXXXXX)
 */
export function formatPhoneForAuth(formattedPhone: string): string {
  // Remove all non-digits
  const digits = formattedPhone.replace(/\D/g, '');
  
  // Handle different input formats
  if (digits.length === 10) {
    // US number without country code
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // US number with country code (1XXXXXXXXXX)
    return `+${digits}`;
  } else if (digits.length === 11 && !digits.startsWith('1')) {
    // Assume it's a US number with extra digit
    return `+1${digits.slice(1)}`;
  }
  
  // Return as-is if it doesn't match expected patterns
  return formattedPhone;
}

/**
 * Validate US phone number
 */
export function isValidUSPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

/**
 * Get display format for phone number (e.g., "+1 (555) 123-4567")
 */
export function getPhoneDisplayFormat(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    const usDigits = digits.slice(1);
    return `+1 (${usDigits.slice(0, 3)}) ${usDigits.slice(3, 6)}-${usDigits.slice(6)}`;
  }
  
  return phone; // Return as-is if not a standard US format
}

/**
 * Extract just the digits for internal use
 */
export function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}
