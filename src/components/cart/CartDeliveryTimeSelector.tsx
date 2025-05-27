import React, { useMemo } from 'react';
import type { DeliveryWindow } from '@/types';

interface CartDeliveryTimeSelectorProps {
  windows: Record<string, DeliveryWindow[]>;
  selectedWindow: string | null;
  onWindowSelect: (window: string | null) => void;
  deliveryDate?: string;
  displayDate?: string;
  disabled?: boolean;
}

export default function CartDeliveryTimeSelector({
  windows,
  selectedWindow,
  onWindowSelect,
  deliveryDate,
  displayDate,
  disabled = false
}: CartDeliveryTimeSelectorProps) {
  const timeSlots = useMemo(() => {
    if (!windows || !deliveryDate) return [];

    // Get the day of the week for the delivery date
    const deliveryDateObj = new Date(deliveryDate + 'T00:00:00'); // Ensure local timezone
    const dayOfWeek = deliveryDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Only get windows for the specific day of the week
    const dayWindows = windows[dayOfWeek] || [];

    return dayWindows.map((window, idx) => {
      const startTime = new Date(`1970-01-01T${window.start}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const endTime = new Date(`1970-01-01T${window.end}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Use the same format as the menu page
      const windowValue = `${deliveryDate}|${window.start}-${window.end}`;
      const isSelected = selectedWindow === windowValue;

      // Mark popular times (11 AM - 1 PM)
      const startHour = parseInt(window.start.split(':')[0]);
      const isPopular = startHour >= 11 && startHour <= 13;

      return {
        ...window,
        startTime,
        endTime,
        windowValue,
        isSelected,
        isPopular,
        idx
      };
    });
  }, [windows, deliveryDate, selectedWindow]);

  if (timeSlots.length === 0) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delivery Time
        </label>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center text-gray-600">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">No delivery windows available</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Delivery Time <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Select your preferred delivery window for {displayDate || 'delivery day'}
      </p>

      {timeSlots.length === 1 ? (
        // Single window: Special card layout
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-base font-bold text-gray-900">
                {timeSlots[0].startTime} – {timeSlots[0].endTime}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                {timeSlots[0].isPopular && (
                  <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-medium">
                    🔥 Popular
                  </span>
                )}
                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">
                  Available
                </span>
              </div>
            </div>
            <svg className="w-6 h-6 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <button
            onClick={() => onWindowSelect(timeSlots[0].windowValue)}
            disabled={disabled}
            className={`
              w-full py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 text-sm
              ${timeSlots[0].isSelected
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {timeSlots[0].isSelected ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Selected
              </span>
            ) : (
              'Select This Time'
            )}
          </button>
        </div>
      ) : (
        // Multiple windows: Dropdown for mobile, buttons for desktop
        <>
          {/* Mobile: Dropdown */}
          <div className="md:hidden">
            <div className="relative">
              <select
                value={selectedWindow || ""}
                onChange={(e) => onWindowSelect(e.target.value || null)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none font-medium"
                disabled={disabled}
              >
                <option value="">
                  🕐 Select Delivery Time
                </option>
                {timeSlots.map((slot) => (
                  <option key={`mobile-window-${slot.idx}`} value={slot.windowValue}>
                    {slot.startTime} – {slot.endTime} {slot.isPopular ? '🔥' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Selected time confirmation on mobile */}
            {selectedWindow && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-orange-900">
                    Delivery time selected: {(() => {
                      const selectedSlot = timeSlots.find(slot => slot.windowValue === selectedWindow);
                      return selectedSlot ? `${selectedSlot.startTime} – ${selectedSlot.endTime}` : selectedWindow;
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop: Button grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {timeSlots.map((slot) => (
              <button
                key={`desktop-window-${slot.idx}`}
                onClick={() => onWindowSelect(slot.windowValue)}
                disabled={disabled}
                className={`
                  relative p-3 rounded-lg border-2 transition-all duration-200 text-left
                  ${slot.isSelected
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-25 hover:shadow-sm'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className={`w-4 h-4 ${slot.isSelected ? 'text-orange-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`font-semibold text-sm ${slot.isSelected ? 'text-orange-900' : 'text-gray-900'}`}>
                      {slot.startTime} – {slot.endTime}
                    </span>
                  </div>
                  {slot.isSelected && (
                    <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {slot.isPopular && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                      🔥 Popular
                    </span>
                  </div>
                )}
                {!slot.isPopular && (
                  <div className="text-xs text-gray-500">
                    Available
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
