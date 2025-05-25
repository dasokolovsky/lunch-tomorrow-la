import { useState, useEffect } from 'react';
import { calculateMenuDay, getDefaultCutoffTimes } from '@/utils/menuDayCalculator';
import type { OrderCutoffTimes } from '../../pages/api/settings';
import type { MenuDayInfo } from '@/utils/menuDayCalculator';

export function useMenuDay() {
  const [menuDayInfo, setMenuDayInfo] = useState<MenuDayInfo | null>(null);
  const [cutoffTimes, setCutoffTimes] = useState<OrderCutoffTimes>(getDefaultCutoffTimes());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveCountdown, setLiveCountdown] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  // Load settings and calculate menu day
  useEffect(() => {
    loadSettingsAndCalculate();
  }, []);

  // Update countdown timer every second without affecting menuDayInfo
  useEffect(() => {
    if (!loading && cutoffTimes) {
      const interval = setInterval(() => {
        updateLiveCountdown();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [loading, cutoffTimes]);

  const loadSettingsAndCalculate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch settings
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      const times = data.order_cutoff_times || getDefaultCutoffTimes();
      setCutoffTimes(times);

      // Calculate initial menu day info
      const info = await calculateMenuDay(times);
      setMenuDayInfo(info);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');

      // Use defaults on error
      const defaultTimes = getDefaultCutoffTimes();
      setCutoffTimes(defaultTimes);

      try {
        const info = await calculateMenuDay(defaultTimes);
        setMenuDayInfo(info);
      } catch (calcError) {
        console.error('Error calculating menu day with defaults:', calcError);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateMenuDayInfo = async () => {
    try {
      const info = await calculateMenuDay(cutoffTimes);
      setMenuDayInfo(info);
    } catch (err) {
      console.error('Error updating menu day info:', err);
    }
  };

  const updateLiveCountdown = () => {
    if (!cutoffTimes || !menuDayInfo || !menuDayInfo.menuDate) {
      return;
    }

    try {
      // Use the same logic as calculateMenuDay but only update countdown
      // Get Pacific time using the same reliable method
      const utcNow = new Date();

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

      const parts = pacificFormatter.formatToParts(utcNow);
      const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
      const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
      const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

      const now = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

      // Get the delivery date from current menuDayInfo
      const deliveryDateString = menuDayInfo.menuDate;
      const [deliveryYear, deliveryMonth, deliveryDay] = deliveryDateString.split('-').map(Number);

      // Calculate cutoff date (day before delivery) in Pacific timezone
      const cutoffDate = new Date(Date.UTC(deliveryYear, deliveryMonth - 1, deliveryDay - 1));

      const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
      const cutoffDayIndex = cutoffDate.getUTCDay(); // Use UTC day to avoid timezone issues
      const cutoffDayName = DAYS_OF_WEEK[cutoffDayIndex];
      const cutoffTime = cutoffTimes[cutoffDayName];

      // Add error handling for undefined cutoffTime
      if (!cutoffTime) {
        console.error('Cutoff time not found for day:', cutoffDayName, 'Available times:', cutoffTimes);
        return; // Exit early if cutoff time is not found
      }

      // Set the full cutoff datetime in Pacific timezone
      const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number);
      const cutoffDateTime = new Date(Date.UTC(deliveryYear, deliveryMonth - 1, deliveryDay - 1, cutoffHours, cutoffMinutes, 0, 0));

      // Calculate countdown
      const timeDiff = cutoffDateTime.getTime() - now.getTime();
      const countdown = {
        hours: Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60))),
        minutes: Math.max(0, Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))),
        seconds: Math.max(0, Math.floor((timeDiff % (1000 * 60)) / 1000)),
        isExpired: timeDiff <= 0
      };

      // Update only the live countdown state
      setLiveCountdown(countdown);
    } catch (err) {
      console.error('Error updating countdown:', err);
    }
  };

  const refresh = () => {
    loadSettingsAndCalculate();
  };

  return {
    menuDayInfo,
    cutoffTimes,
    loading,
    error,
    refresh,
    liveCountdown
  };
}

export default useMenuDay;
