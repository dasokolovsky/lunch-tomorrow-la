// Service Worker for Lunch Tomorrow LA
// Provides offline functionality and caching strategies

const CACHE_NAME = 'lunch-tomorrow-v1';
const STATIC_CACHE_NAME = 'lunch-tomorrow-static-v1';
const DYNAMIC_CACHE_NAME = 'lunch-tomorrow-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/menu',
  '/cart',
  '/manifest.json',
  // Add critical CSS and JS files here
];

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = {
  // Long-term cache for static data
  STATIC_DATA: [
    '/api/delivery-zones',
    '/api/settings',
  ],
  // Short-term cache for dynamic data
  DYNAMIC_DATA: [
    '/api/menu',
    '/api/menu-items',
    '/api/pricing-settings',
  ],
  // Network-first for real-time data
  NETWORK_FIRST: [
    '/api/orders',
    '/api/user',
    '/api/auth',
  ],
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Static assets cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('❌ Service Worker: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated and ready');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // API requests - use different strategies based on endpoint
    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest(request);
    }
    
    // Static assets - cache first
    if (isStaticAsset(url.pathname)) {
      return await cacheFirst(request, STATIC_CACHE_NAME);
    }
    
    // Pages - network first with cache fallback
    return await networkFirst(request, DYNAMIC_CACHE_NAME);
    
  } catch (error) {
    console.error('❌ Service Worker: Fetch failed:', error);
    
    // Return offline fallback if available
    return await getOfflineFallback(request);
  }
}

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Static data - cache first (delivery zones, settings)
  if (API_CACHE_PATTERNS.STATIC_DATA.some(pattern => pathname.includes(pattern))) {
    return await cacheFirst(request, DYNAMIC_CACHE_NAME, 30 * 60 * 1000); // 30 min TTL
  }
  
  // Dynamic data - network first with cache fallback
  if (API_CACHE_PATTERNS.DYNAMIC_DATA.some(pattern => pathname.includes(pattern))) {
    return await networkFirst(request, DYNAMIC_CACHE_NAME, 5 * 60 * 1000); // 5 min TTL
  }
  
  // Real-time data - network only with offline fallback
  if (API_CACHE_PATTERNS.NETWORK_FIRST.some(pattern => pathname.includes(pattern))) {
    return await networkOnly(request);
  }
  
  // Default: network first
  return await networkFirst(request, DYNAMIC_CACHE_NAME);
}

// Cache first strategy - good for static assets
async function cacheFirst(request, cacheName, ttl = null) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check TTL if specified
    if (ttl) {
      const cachedTime = new Date(cachedResponse.headers.get('sw-cached-time') || 0);
      const now = new Date();
      if (now - cachedTime > ttl) {
        // Cache expired, fetch new data in background
        fetchAndCache(request, cacheName);
        return cachedResponse; // Return stale data immediately
      }
    }
    return cachedResponse;
  }
  
  // Not in cache, fetch and cache
  return await fetchAndCache(request, cacheName);
}

// Network first strategy - good for dynamic content
async function networkFirst(request, cacheName, ttl = null) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      await cacheResponse(request, response.clone(), cacheName);
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('📱 Service Worker: Serving from cache (offline):', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// Network only strategy - for real-time data
async function networkOnly(request) {
  return await fetch(request);
}

// Helper function to fetch and cache
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  
  if (response.ok) {
    await cacheResponse(request, response.clone(), cacheName);
  }
  
  return response;
}

// Helper function to cache response with timestamp
async function cacheResponse(request, response, cacheName) {
  const cache = await caches.open(cacheName);
  
  // Add timestamp header for TTL checking
  const responseWithTimestamp = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'sw-cached-time': new Date().toISOString(),
    },
  });
  
  await cache.put(request, responseWithTimestamp);
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  return pathname.startsWith('/_next/') || 
         pathname.endsWith('.js') || 
         pathname.endsWith('.css') || 
         pathname.endsWith('.png') || 
         pathname.endsWith('.jpg') || 
         pathname.endsWith('.jpeg') || 
         pathname.endsWith('.svg') || 
         pathname.endsWith('.ico');
}

// Get offline fallback page
async function getOfflineFallback(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  // Try to return cached version of the same page
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return cached homepage as fallback
  const homePage = await cache.match('/');
  if (homePage) {
    return homePage;
  }
  
  // Last resort: return a basic offline message
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Please check your internet connection.',
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Service Worker: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  // For example, retry failed API requests
  console.log('🔄 Service Worker: Performing background sync');
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('📱 Service Worker: Push notification received:', data);
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'lunch-tomorrow',
        requireInteraction: true,
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('🚀 Service Worker: Loaded and ready');
