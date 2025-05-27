import React, { useState, useEffect } from 'react';
import { useOfflineDetection } from '@/hooks/useServiceWorker';

interface OfflineIndicatorProps {
  className?: string;
}

export default function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const { isOnline, isOffline, wasOffline } = useOfflineDetection();
  const [showReconnected, setShowReconnected] = useState(false);
  const [confirmedOffline, setConfirmedOffline] = useState(false);

  // Show "reconnected" message briefly when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      setConfirmedOffline(false);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000); // Show for 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Only show offline message after a delay to avoid false positives
  useEffect(() => {
    if (isOffline) {
      const timer = setTimeout(() => {
        setConfirmedOffline(true);
      }, 2000); // Wait 2 seconds before showing offline message

      return () => clearTimeout(timer);
    } else {
      setConfirmedOffline(false);
    }
  }, [isOffline]);

  // Don't render anything if online and never was offline
  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      {confirmedOffline && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>You're offline. Some features may not be available.</span>
          </div>
        </div>
      )}

      {showReconnected && (
        <div className="bg-green-600 text-white text-center py-2 px-4 text-sm font-medium animate-slide-down">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Back online! Data is being refreshed.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// PWA Install Prompt Component
interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleInstall = () => {
    onInstall?.();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    onDismiss?.();
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Install Lunch Tomorrow
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Add to your home screen for quick access and offline ordering.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Not now
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Service Worker Update Prompt
interface UpdatePromptProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
}

export function UpdatePrompt({ onUpdate, onDismiss }: UpdatePromptProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleUpdate = () => {
    onUpdate?.();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    onDismiss?.();
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold mb-1">
              Update Available
            </h3>
            <p className="text-sm text-blue-100 mb-3">
              A new version is ready. Update now for the latest features.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="bg-white text-blue-600 text-xs font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={handleDismiss}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Later
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-200 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
