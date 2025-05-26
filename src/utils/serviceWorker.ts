// Service Worker registration and management utilities

interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

// Check if service workers are supported
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

// Register service worker
export async function registerServiceWorker(config: ServiceWorkerConfig = {}): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.log('🚫 Service Worker: Not supported in this browser');
    return null;
  }

  try {
    console.log('🔧 Service Worker: Registering...');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('✅ Service Worker: Registered successfully');

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      console.log('🔄 Service Worker: Update found, installing new version...');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available
            console.log('🆕 Service Worker: New content available');
            config.onUpdate?.(registration);
          } else {
            // Content is cached for offline use
            console.log('📱 Service Worker: Content cached for offline use');
            config.onSuccess?.(registration);
          }
        }
      });
    });

    // Handle controller change (when new SW takes control)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker: Controller changed, reloading page...');
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('❌ Service Worker: Registration failed:', error);
    config.onError?.(error as Error);
    return null;
  }
}

// Unregister service worker
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('🗑️ Service Worker: Unregistered successfully');
      return result;
    }
    return false;
  } catch (error) {
    console.error('❌ Service Worker: Unregistration failed:', error);
    return false;
  }
}

// Update service worker
export async function updateServiceWorker(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      console.log('🔄 Service Worker: Checking for updates...');
      await registration.update();
    }
  } catch (error) {
    console.error('❌ Service Worker: Update check failed:', error);
  }
}

// Skip waiting and activate new service worker immediately
export async function skipWaitingAndActivate(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      console.log('⏭️ Service Worker: Skipping waiting and activating new version...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (error) {
    console.error('❌ Service Worker: Skip waiting failed:', error);
  }
}

// Get service worker status
export async function getServiceWorkerStatus(): Promise<{
  supported: boolean;
  registered: boolean;
  active: boolean;
  waiting: boolean;
  installing: boolean;
}> {
  if (!isServiceWorkerSupported()) {
    return {
      supported: false,
      registered: false,
      active: false,
      waiting: false,
      installing: false,
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    return {
      supported: true,
      registered: !!registration,
      active: !!registration?.active,
      waiting: !!registration?.waiting,
      installing: !!registration?.installing,
    };
  } catch (error) {
    console.error('❌ Service Worker: Status check failed:', error);
    return {
      supported: true,
      registered: false,
      active: false,
      waiting: false,
      installing: false,
    };
  }
}

// Clear all caches
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('🗑️ Service Worker: All caches cleared');
  } catch (error) {
    console.error('❌ Service Worker: Failed to clear caches:', error);
  }
}

// Get cache storage usage
export async function getCacheStorageUsage(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, percentage };
  } catch (error) {
    console.error('❌ Service Worker: Failed to get storage usage:', error);
    return { usage: 0, quota: 0, percentage: 0 };
  }
}

// Format bytes for display
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Check if app is running in standalone mode (PWA)
export function isStandalone(): boolean {
  return typeof window !== 'undefined' && 
         (window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true);
}

// Check if app can be installed (PWA)
export function canInstallPWA(): boolean {
  return typeof window !== 'undefined' && 'BeforeInstallPromptEvent' in window;
}

// Prompt PWA installation
export async function promptPWAInstall(deferredPrompt: any): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`PWA install prompt outcome: ${outcome}`);
    return outcome === 'accepted';
  } catch (error) {
    console.error('❌ PWA install prompt failed:', error);
    return false;
  }
}
