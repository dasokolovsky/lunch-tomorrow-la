import React from 'react';
import type { DeliveryWindow } from '@/types';

interface TimeWindowSelectorProps {
  windows: Record<string, DeliveryWindow[]>;
  selectedWindow: string | null;
  onWindowSelect: (window: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function TimeWindowSelector({
  windows,
  selectedWindow,
  onWindowSelect,
  disabled = false,
  className = ""
}: TimeWindowSelectorProps) {
  // Get today's day of week (lowercase)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  // Get available windows for today
  const todayWindows = windows[today] || [];
  
  // Format time window for display
  const formatTimeWindow = (window: DeliveryWindow): string => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    
    return `${formatTime(window.start)} - ${formatTime(window.end)}`;
  };

  // Create window identifier for selection
  const getWindowId = (window: DeliveryWindow): string => {
    return `${window.start}-${window.end}`;
  };

  if (todayWindows.length === 0) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center text-gray-600">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">No delivery windows available for today</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        Select Delivery Time <span className="text-red-500">*</span>
      </label>
      
      <div className="space-y-2">
        {todayWindows.map((window, index) => {
          const windowId = getWindowId(window);
          const isSelected = selectedWindow === windowId;
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => onWindowSelect(windowId)}
              disabled={disabled}
              className={`w-full p-3 text-left border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="font-medium">{formatTimeWindow(window)}</span>
                </div>
                
                {isSelected && (
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Showing delivery windows for {today.charAt(0).toUpperCase() + today.slice(1)}
      </p>
    </div>
  );
}
