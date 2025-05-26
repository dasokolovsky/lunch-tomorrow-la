import { useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker,
  updateServiceWorker,
  skipWaitingAndActivate,
  getServiceWorkerStatus,
  clearAllCaches,
  getCacheStorageUsage,
  formatBytes,
  isStandalone,
  canInstallPWA,
  promptPWAInstall,
} from '@/utils/serviceWorker';

interface ServiceWorkerState {
  supported: boolean;
  registered: boolean;
  active: boolean;
  waiting: boolean;
  installing: boolean;
  updateAvailable: boolean;
  isOnline: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  cacheUsage: {
    usage: number;
    quota: number;
    percentage: number;
    formatted: {
      usage: string;
      quota: string;
    };
  };
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    supported: false,
    registered: false,
    active: false,
    waiting: false,
    installing: false,
    updateAvailable: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isStandalone: false,
    canInstall: false,
    cacheUsage: {
      usage: 0,
      quota: 0,
      percentage: 0,
      formatted: { usage: '0 Bytes', quota: '0 Bytes' },
    },
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  // Update service worker status
  const updateStatus = useCallback(async () => {
    const status = await getServiceWorkerStatus();
    const cacheUsage = await getCacheStorageUsage();
    
    setState(prev => ({
      ...prev,
      ...status,
      isStandalone: isStandalone(),
      canInstall: canInstallPWA() && !!deferredPrompt,
      cacheUsage: {
        ...cacheUsage,
        formatted: {
          usage: formatBytes(cacheUsage.usage),
          quota: formatBytes(cacheUsage.quota),
        },
      },
    }));
  }, [deferredPrompt]);

  // Register service worker on mount
  useEffect(() => {
    const register = async () => {
      try {
        await registerServiceWorker({
          onUpdate: (registration) => {
            console.log('🆕 Service Worker: Update available');
            setState(prev => ({ ...prev, updateAvailable: true, waiting: true }));
            setShowUpdatePrompt(true);
          },
          onSuccess: (registration) => {
            console.log('✅ Service Worker: Ready for offline use');
            updateStatus();
          },
          onError: (error) => {
            console.error('❌ Service Worker: Registration failed:', error);
          },
        });
        
        await updateStatus();
      } catch (error) {
        console.error('❌ Service Worker: Setup failed:', error);
      }
    };

    register();
  }, [updateStatus]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      console.log('🌐 App: Back online');
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      console.log('📴 App: Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setState(prev => ({ ...prev, canInstall: true }));
      console.log('📱 PWA: Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Update cache usage periodically
  useEffect(() => {
    const interval = setInterval(updateStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [updateStatus]);

  // Actions
  const actions = {
    // Update service worker
    update: useCallback(async () => {
      try {
        await updateServiceWorker();
        await updateStatus();
      } catch (error) {
        console.error('❌ Service Worker: Update failed:', error);
      }
    }, [updateStatus]),

    // Activate waiting service worker
    activateUpdate: useCallback(async () => {
      try {
        await skipWaitingAndActivate();
        setShowUpdatePrompt(false);
        setState(prev => ({ ...prev, updateAvailable: false }));
      } catch (error) {
        console.error('❌ Service Worker: Activation failed:', error);
      }
    }, []),

    // Dismiss update prompt
    dismissUpdate: useCallback(() => {
      setShowUpdatePrompt(false);
    }, []),

    // Clear all caches
    clearCaches: useCallback(async () => {
      try {
        await clearAllCaches();
        await updateStatus();
        console.log('🗑️ Service Worker: All caches cleared');
      } catch (error) {
        console.error('❌ Service Worker: Failed to clear caches:', error);
      }
    }, [updateStatus]),

    // Install PWA
    installPWA: useCallback(async () => {
      try {
        const installed = await promptPWAInstall(deferredPrompt);
        if (installed) {
          setDeferredPrompt(null);
          setState(prev => ({ ...prev, canInstall: false }));
        }
        return installed;
      } catch (error) {
        console.error('❌ PWA: Installation failed:', error);
        return false;
      }
    }, [deferredPrompt]),

    // Refresh status
    refreshStatus: updateStatus,
  };

  return {
    ...state,
    showUpdatePrompt,
    actions,
  };
}

// Hook for offline detection with enhanced features
export function useOfflineDetection() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        console.log('🌐 Connection restored');
        // Trigger data refresh when coming back online
        window.dispatchEvent(new CustomEvent('connection-restored'));
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      console.log('📴 Connection lost');
      // Trigger offline mode
      window.dispatchEvent(new CustomEvent('connection-lost'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
  };
}
