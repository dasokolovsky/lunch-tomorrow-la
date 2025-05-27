# Optimization Implementation Guide

This document provides detailed implementation guidance for the optimizations applied to Lunch Tomorrow LA.

## 🏗️ **Architecture Patterns**

### **Component Composition Pattern**
```typescript
// Before: Monolithic component (1,083 lines)
function MenuPage() {
  // All logic mixed together
  return <div>{/* Everything in one component */}</div>
}

// After: Composed components (200 lines)
function MenuPage() {
  const { menuDayInfo, liveCountdown } = useMenuDay();
  const { menuItems, loading, error } = useMenuData(menuDayInfo);
  const { cart, addToCart } = useCart();
  
  return (
    <div>
      <MenuHeader menuDayInfo={menuDayInfo} liveCountdown={liveCountdown} />
      <MenuItemsList menuItems={menuItems} onAddToCart={addToCart} />
      <CartButton cart={cart} />
    </div>
  );
}
```

### **Custom Hooks Pattern**
```typescript
// Encapsulate complex state logic
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const addToCart = useCallback((item: MenuItem, deliveryDate: string) => {
    // Complex cart logic here
  }, []);
  
  return { cart, addToCart, clearCart, updateQuantity };
}
```

### **React Query Integration Pattern**
```typescript
// Smart caching with different strategies
export function useMenuData(menuDayInfo: MenuDayInfo | null) {
  const menuQuery = useQuery({
    queryKey: ['menu', menuDayInfo?.menuDate],
    queryFn: () => fetchMenu(menuDayInfo?.menuDate),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!menuDayInfo?.hasMenus,
  });
  
  return {
    menuItems: menuQuery.data || [],
    loading: menuQuery.isLoading,
    error: menuQuery.error?.message,
  };
}
```

## 🎯 **Performance Optimization Techniques**

### **Memoization Strategy**
```typescript
// Memoize expensive computations
const canOrder = useMemo(() =>
  Boolean(deliveryInfo?.isEligible && 
          selectedWindow !== null && 
          !liveCountdown?.isExpired && 
          menuDayInfo?.hasMenus),
  [deliveryInfo?.isEligible, selectedWindow, liveCountdown?.isExpired, menuDayInfo?.hasMenus]
);

// Memoize event handlers
const handleAddToCart = useCallback((item: MenuItem) => {
  addToCart(item, menuDayInfo.menuDate);
  setToast(`Added "${item.name}" to cart`);
}, [addToCart, menuDayInfo?.menuDate]);

// Memoize components
const MenuItemCard = memo(({ item, onAddToCart }) => {
  return <div>{/* Component JSX */}</div>;
});
```

### **Virtual Scrolling Implementation**
```typescript
export function VirtualizedMenuList({ menuItems, onAddToCart }) {
  const shouldVirtualize = menuItems.length > 10;
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: menuItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });
  
  if (!shouldVirtualize) {
    return <NormalList items={menuItems} />;
  }
  
  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      {/* Virtual items rendering */}
    </div>
  );
}
```

### **Caching Strategy Implementation**
```typescript
// Query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes default
      gcTime: 10 * 60 * 1000,       // 10 minutes garbage collection
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Different cache times for different data types
const CACHE_STRATEGIES = {
  STATIC: { staleTime: 30 * 60 * 1000 },    // 30 min - delivery zones
  DYNAMIC: { staleTime: 15 * 60 * 1000 },   // 15 min - menu items
  REALTIME: { staleTime: 5 * 60 * 1000 },   // 5 min - order settings
};
```

## 🔧 **Service Worker Implementation**

### **Caching Strategies**
```javascript
// Cache-first for static assets
async function cacheFirst(request, cacheName, ttl = null) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse, ttl)) {
    return cachedResponse;
  }
  
  return await fetchAndCache(request, cacheName);
}

// Network-first for dynamic content
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cacheResponse(request, response.clone(), cacheName);
    }
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}
```

### **Background Sync**
```typescript
export function useBackgroundSync() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refresh stale data when page becomes visible
        queryClient.invalidateQueries({
          predicate: (query) => query.isStale(),
          refetchType: 'active',
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient]);
}
```

## 📱 **PWA Implementation**

### **Manifest Configuration**
```json
{
  "name": "Lunch Tomorrow LA",
  "short_name": "Lunch Tomorrow",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#f97316",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "View Menu",
      "url": "/menu",
      "icons": [{"src": "/icons/shortcut-menu.png", "sizes": "96x96"}]
    }
  ]
}
```

### **Install Prompt Handling**
```typescript
export function useServiceWorker() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);
  
  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      return outcome === 'accepted';
    }
    return false;
  };
  
  return { canInstall: !!deferredPrompt, installPWA };
}
```

## 🚨 **Common Pitfalls & Solutions**

### **TypeScript Issues**
```typescript
// ❌ Wrong: JSX in .ts file
export function createComponent() {
  return <div>Hello</div>; // Error in .ts file
}

// ✅ Correct: Use React.createElement or .tsx file
export function createComponent() {
  return React.createElement('div', null, 'Hello');
}

// ❌ Wrong: Missing display name
const Component = React.forwardRef((props, ref) => <div />);

// ✅ Correct: Add display name
const Component = React.forwardRef((props, ref) => <div />);
Component.displayName = 'Component';
```

### **React Query API Changes**
```typescript
// ❌ Wrong: Old API
const fetchingQueries = queries.filter(q => q.isFetching()).length;

// ✅ Correct: New API
const fetchingQueries = queries.filter(q => q.state.fetchStatus === 'fetching').length;
```

### **Performance Anti-patterns**
```typescript
// ❌ Wrong: Creating functions in render
function Component() {
  return <button onClick={() => doSomething()}>Click</button>;
}

// ✅ Correct: Memoize with useCallback
function Component() {
  const handleClick = useCallback(() => doSomething(), []);
  return <button onClick={handleClick}>Click</button>;
}
```

## 🔍 **Debugging & Monitoring**

### **Performance Monitoring**
```typescript
export function QueryPerformanceMonitor() {
  const queryClient = useQueryClient();
  
  const getStats = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
    };
  };
  
  // Render stats in development
}
```

### **Error Boundaries**
```typescript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error reporting service
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
```

## 📈 **Deployment Checklist**

### **Pre-deployment Steps**
1. ✅ Run `npm run build` locally
2. ✅ Fix all TypeScript errors
3. ✅ Test PWA functionality
4. ✅ Verify service worker registration
5. ✅ Check bundle size optimization
6. ✅ Test offline functionality
7. ✅ Validate React Query caching
8. ✅ Test virtual scrolling performance

### **Post-deployment Verification**
1. ✅ Verify PWA install prompt works
2. ✅ Test offline functionality
3. ✅ Check service worker caching
4. ✅ Monitor performance metrics
5. ✅ Validate React Query DevTools (dev only)
6. ✅ Test mobile responsiveness
7. ✅ Verify virtual scrolling on large lists

This guide provides the foundation for maintaining and extending the optimizations implemented in the Lunch Tomorrow LA application.
