import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect by default (can be overridden)
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  // Menu related queries
  menu: {
    all: ['menu'] as const,
    day: (date: string) => ['menu', 'day', date] as const,
    items: (menuId: string) => ['menu', 'items', menuId] as const,
  },
  
  // Delivery related queries
  delivery: {
    all: ['delivery'] as const,
    zones: () => ['delivery', 'zones'] as const,
    validation: (lat: number, lon: number) => ['delivery', 'validation', lat, lon] as const,
  },
  
  // Settings related queries
  settings: {
    all: ['settings'] as const,
    cutoff: () => ['settings', 'cutoff'] as const,
    pricing: () => ['settings', 'pricing'] as const,
  },
  
  // User related queries
  user: {
    all: ['user'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
    addresses: (userId: string) => ['user', 'addresses', userId] as const,
    orders: (userId: string) => ['user', 'orders', userId] as const,
  },
  
  // Admin related queries
  admin: {
    all: ['admin'] as const,
    users: (filters?: any) => ['admin', 'users', filters] as const,
    orders: (filters?: any) => ['admin', 'orders', filters] as const,
    analytics: () => ['admin', 'analytics'] as const,
  },
} as const;
