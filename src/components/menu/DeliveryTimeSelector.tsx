import React, { useMemo } from 'react';
import type { MenuDayInfo } from '@/utils/menuDayCalculator';
import type { DeliveryWindow } from '@/types';

interface DeliveryTimeSelectorProps {
  deliveryInfo: {
    isEligible: boolean;
    zones: any[];
    mergedWindows: Record<string, DeliveryWindow[]>;
    primaryZone: any;
  } | null;
  menuDayInfo: MenuDayInfo | null;
  selectedWindow: string | null;
  addressValidating: boolean;
  onSelectWindow: (window: string | null) => void;
}

export default function DeliveryTimeSelector({
  deliveryInfo,
  menuDayInfo,
  selectedWindow,
  addressValidating,
  onSelectWindow
}: DeliveryTimeSelectorProps) {
  const timeSlots = useMemo(() => {
    if (!deliveryInfo?.isEligible || !menuDayInfo?.menuDate) return [];

    // Get all unique windows across all days (since we only show one delivery day)
    const allWindows = Object.values(deliveryInfo.mergedWindows).flat();

    return allWindows.map((window, idx) => {
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

      const windowValue = `${menuDayInfo.menuDate}|${window.start}-${window.end}`;
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
  }, [deliveryInfo, menuDayInfo, selectedWindow]);

  if (!deliveryInfo?.isEligible || timeSlots.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Desktop: Show full header */}
      <div className="hidden md:block px-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Choose Delivery Time</h3>
        </div>
        <p className="text-sm text-gray-600">
          Select your preferred delivery window for {menuDayInfo?.displayDate}
        </p>
      </div>

      {/* Mobile: Simple header */}
      <div className="md:hidden px-6 mb-2">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Delivery Time
        </h3>
      </div>

      {/* Desktop: Card Grid or Single Card */}
      <div className={`hidden md:block px-6 ${timeSlots.length === 1 ? '' : 'grid md:grid-cols-2 lg:grid-cols-3 gap-3'}`}>
        {timeSlots.length === 1 ? (
          // Single window: Special centered layout
          <div className="max-w-md mx-auto">
            <div className={`
              relative p-6 rounded-xl border-2 transition-all duration-200 text-center
              ${timeSlots[0].isSelected
                ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg'
                : 'border-orange-200 bg-gradient-to-br from-white to-orange-25 hover:border-orange-400 hover:shadow-md'
              }
              ${addressValidating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}>
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">
                  {timeSlots[0].startTime} – {timeSlots[0].endTime}
                </h4>
                <p className="text-sm text-gray-600">
                  {timeSlots[0].isSelected ? 'Selected delivery window' : 'Available delivery window'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 mb-4">
                {timeSlots[0].isPopular && (
                  <span className="text-sm bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
                    🔥 Popular Time
                  </span>
                )}
                <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                  ✅ Available
                </span>
              </div>

              <button
                onClick={() => onSelectWindow(timeSlots[0].windowValue)}
                disabled={addressValidating}
                className={`
                  w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200
                  ${timeSlots[0].isSelected
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md'
                  }
                  ${addressValidating ? 'opacity-50 cursor-not-allowed' : ''}
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
          </div>
        ) : (
          // Multiple windows: Grid layout
          timeSlots.map((slot) => (
            <button
              key={`desktop-window-${slot.idx}`}
              onClick={() => onSelectWindow(slot.windowValue)}
              disabled={addressValidating}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200 text-left
                ${slot.isSelected
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-25 hover:shadow-sm'
                }
                ${addressValidating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 ${slot.isSelected ? 'text-orange-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-semibold ${slot.isSelected ? 'text-orange-900' : 'text-gray-900'}`}>
                    {slot.startTime} – {slot.endTime}
                  </span>
                </div>
                {slot.isSelected && (
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
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
          ))
        )}
      </div>

      {/* Mobile: Enhanced Dropdown or Single Card */}
      <div className="md:hidden px-6">
        {timeSlots.length === 1 ? (
          // Single window: Compact card for mobile
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
              onClick={() => onSelectWindow(timeSlots[0].windowValue)}
              disabled={addressValidating}
              className={`
                w-full py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 text-sm
                ${timeSlots[0].isSelected
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                }
                ${addressValidating ? 'opacity-50 cursor-not-allowed' : ''}
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
          // Multiple windows: Dropdown
          <>
            <div className="relative">
              <select
                value={selectedWindow || ""}
                onChange={(e) => onSelectWindow(e.target.value || null)}
                className="w-full px-4 py-4 bg-white border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none font-medium shadow-sm"
                disabled={addressValidating}
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
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </>
        )}
      </div>
    </div>
  );
}
