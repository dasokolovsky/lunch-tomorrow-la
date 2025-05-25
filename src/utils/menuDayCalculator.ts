import type { OrderCutoffTimes } from '../../pages/api/settings';

export interface MenuDayInfo {
  menuDate: string; // YYYY-MM-DD format
  displayDate: string; // "Tuesday, March 12th"
  isNextDay: boolean; // true if showing next day's menu due to cutoff
  nextCutoffTime: string; // "Monday 6:00 PM PT"
  timeUntilCutoff: {
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  };
  hasMenus: boolean; // true if future menus are available
  noMenusReason?: 'temporary' | 'longer-term'; // why no menus are available
  lastAvailableMenu?: {
    date: string;
    displayDate: string;
  };
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * Get current Pacific Time
 * Returns a Date object that represents the current time in Pacific timezone
 */
function getPacificTime(): Date {
  const now = new Date();

  // Get Pacific time components
  const pacificFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = pacificFormatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

  // Create a Date object that represents this Pacific time as if it were UTC
  // This way, when we call toISOString(), we get the Pacific date/time
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

/**
 * Format date as "Tuesday, March 12th"
 */
function formatDisplayDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles'
  };

  const formatted = date.toLocaleDateString('en-US', options);

  // Add ordinal suffix (st, nd, rd, th)
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);

  return formatted.replace(/\d+/, `${day}${suffix}`);
}

/**
 * Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Check if a date has menu items available
 */
export async function hasMenuItems(date: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/menu-items?date=${date}`);
    if (!response.ok) return false;

    const items = await response.json();
    return Array.isArray(items) && items.length > 0;
  } catch (error) {
    console.error('Error checking menu items:', error);
    return false;
  }
}

/**
 * Find the next available menu date (skipping closed days)
 */
export async function findNextAvailableMenuDate(startDate: Date): Promise<Date | null> {
  const checkDate = new Date(startDate);
  let attempts = 0;
  const maxAttempts = 14; // Check up to 2 weeks ahead

  while (attempts < maxAttempts) {
    const dateString = checkDate.toISOString().split('T')[0];
    const hasItems = await hasMenuItems(dateString);

    if (hasItems) {
      return checkDate;
    }

    // Move to next day
    checkDate.setDate(checkDate.getDate() + 1);
    attempts++;
  }

  // No menu found in 2 weeks
  return null;
}

/**
 * Check if no menus are available and determine if it's temporary or longer-term
 */
function determineNoMenusReason(startDate: Date): 'temporary' | 'longer-term' {
  const now = getPacificTime();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();

  // Check if it's weekend (Friday evening through Sunday)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || (dayOfWeek === 5 && hour >= 17);

  // Check if we're within 3 days of start date
  const daysDiff = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isWithin3Days = daysDiff <= 3;

  // Temporary if it's weekend OR within 3 days
  if (isWeekend || isWithin3Days) {
    return 'temporary';
  }

  return 'longer-term';
}

/**
 * Get the most recent past menu for preview
 */
export async function getLastAvailableMenu(): Promise<{ date: string; displayDate: string } | null> {
  const now = getPacificTime();
  const checkDate = new Date(now);
  checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

  let attempts = 0;
  const maxAttempts = 30; // Check up to 30 days back

  while (attempts < maxAttempts) {
    const dateString = checkDate.toISOString().split('T')[0];
    const hasItems = await hasMenuItems(dateString);

    if (hasItems) {
      return {
        date: dateString,
        displayDate: formatDisplayDate(checkDate)
      };
    }

    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1);
    attempts++;
  }

  return null;
}

/**
 * Calculate current menu day based on cutoff times
 * Logic: Each menu has a delivery day and cutoff day (day before delivery)
 * Show the menu whose cutoff hasn't passed yet
 */
export async function calculateMenuDay(cutoffTimes: OrderCutoffTimes): Promise<MenuDayInfo> {
  const now = getPacificTime();
  // const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // Find the next available menu by checking each potential delivery day
  const deliveryDate = new Date(now);
  let foundMenu = false;
  let attempts = 0;
  const maxAttempts = 14; // Check up to 2 weeks ahead

  while (!foundMenu && attempts < maxAttempts) {
    const deliveryDateString = deliveryDate.toISOString().split('T')[0];
    const hasItems = await hasMenuItems(deliveryDateString);

    if (hasItems) {
      // Found a menu for this delivery date
      // Now check if we're still within the cutoff time for this menu

      // Calculate cutoff date (day before delivery)
      // Parse delivery date string to get the actual date components
      const [deliveryYear, deliveryMonth, deliveryDay] = deliveryDateString.split('-').map(Number);

      // Create cutoff date (day before delivery) in Pacific timezone
      const cutoffDate = new Date(Date.UTC(deliveryYear, deliveryMonth - 1, deliveryDay - 1));

      const cutoffDayIndex = cutoffDate.getUTCDay(); // Use UTC day to avoid timezone issues
      const cutoffDayName = DAYS_OF_WEEK[cutoffDayIndex];
      const cutoffTime = cutoffTimes[cutoffDayName];

      // Add error handling for undefined cutoffTime
      if (!cutoffTime) {
        console.error('Cutoff time not found for day:', cutoffDayName, 'Available times:', cutoffTimes);
        continue; // Skip this delivery date and try the next one
      }

      // Set the full cutoff datetime in Pacific timezone
      const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number);
      const cutoffDateTime = new Date(Date.UTC(deliveryYear, deliveryMonth - 1, deliveryDay - 1, cutoffHours, cutoffMinutes, 0, 0));

      // Check if we're still before the cutoff
      if (now <= cutoffDateTime) {
        // We can still order for this delivery date
        foundMenu = true;

        // Calculate countdown to cutoff
        const timeDiff = cutoffDateTime.getTime() - now.getTime();
        const timeUntilCutoff = {
          hours: Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60))),
          minutes: Math.max(0, Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))),
          seconds: Math.max(0, Math.floor((timeDiff % (1000 * 60)) / 1000)),
          isExpired: timeDiff <= 0
        };

        return {
          menuDate: deliveryDateString,
          displayDate: formatDisplayDate(deliveryDate),
          isNextDay: deliveryDate.toDateString() !== now.toDateString(),
          nextCutoffTime: `${DAY_NAMES[cutoffDayIndex]} ${formatTime12Hour(cutoffTime)} PT`,
          timeUntilCutoff,
          hasMenus: true
        };
      }
      // If cutoff has passed, continue to next day
    }

    // Move to next day
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    attempts++;
  }

  // No available menus found
  const noMenusReason = determineNoMenusReason(new Date(now));
  const lastAvailableMenu = await getLastAvailableMenu();

  return {
    menuDate: '', // No menu date available
    displayDate: 'No menu available',
    isNextDay: false,
    nextCutoffTime: 'N/A',
    timeUntilCutoff: {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true
    },
    hasMenus: false,
    noMenusReason,
    lastAvailableMenu: lastAvailableMenu || undefined
  };
}

/**
 * Convert 24-hour time to 12-hour format
 */
function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get default cutoff times (6:00 PM for all days)
 */
export function getDefaultCutoffTimes(): OrderCutoffTimes {
  return {
    monday: "18:00",
    tuesday: "18:00",
    wednesday: "18:00",
    thursday: "18:00",
    friday: "18:00",
    saturday: "18:00",
    sunday: "18:00"
  };
}
