import React from 'react';
import type { MenuDayInfo } from '@/utils/menuDayCalculator';

interface MenuHeaderProps {
  menuDayInfo: MenuDayInfo | null;
  liveCountdown: {
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null;
}

export default function MenuHeader({ menuDayInfo, liveCountdown }: MenuHeaderProps) {
  return (
    <>
      {/* Header Section - Mobile First Design */}
      <div className="relative bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 text-white overflow-hidden">
        {/* Background Food Elements - Subtle */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 left-8 w-16 h-16 bg-white rounded-full opacity-20"></div>
          <div className="absolute top-16 right-12 w-12 h-12 bg-white rounded-full opacity-15"></div>
          <div className="absolute bottom-12 left-1/4 w-8 h-8 bg-white rounded-full opacity-25"></div>
          <div className="absolute bottom-8 right-1/3 w-6 h-6 bg-white rounded-full opacity-20"></div>
        </div>

        <div className="relative px-4 py-6 md:py-8">
          <div className="max-w-md mx-auto md:max-w-2xl">
            {/* Logo and Title */}
            <div className="flex items-center justify-center mb-4 md:mb-6">
              <div className="bg-white p-2 rounded-full mr-3">
                <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.20-1.10-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                </svg>
              </div>
              <h1 className="text-xl md:text-3xl font-bold">Lunch Tomorrow</h1>
            </div>
            <p className="text-center text-sm md:text-lg opacity-90 mb-6">Order your lunch for tomorrow</p>
          </div>
        </div>
      </div>

      {/* Main Content Card - Mobile First */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="max-w-md mx-auto md:max-w-2xl">
          <div className="bg-white rounded-t-3xl shadow-lg">
            {/* Menu Header */}
            <div className="px-6 py-6 border-b border-gray-100">
              {menuDayInfo ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                      Menu for Delivery
                    </h2>
                    <div className="text-right text-xs text-gray-500">
                      {menuDayInfo.isNextDay ? 'Next available' : 'Today'}
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-orange-600 mb-4">
                    {menuDayInfo.displayDate}
                  </p>

                  {/* Cutoff Status */}
                  {liveCountdown?.isExpired ? (
                    <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-orange-800">
                          <span className="font-medium">Ordering closed.</span> Check back tomorrow!
                        </p>
                      </div>
                    </div>
                  ) : liveCountdown ? (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Order by Sunday 9:00 PM PT for delivery on {menuDayInfo.displayDate}</span>
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Live Countdown */}
                  {liveCountdown && !liveCountdown.isExpired && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Time remaining</p>
                      <div className="text-2xl font-bold text-red-600 font-mono">
                        {String(liveCountdown.hours).padStart(2, '0')}:
                        {String(liveCountdown.minutes).padStart(2, '0')}:
                        {String(liveCountdown.seconds).padStart(2, '0')}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
