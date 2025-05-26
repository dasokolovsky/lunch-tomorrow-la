import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { prefetchCriticalData, invalidateStaleData } from '@/utils/prefetch';

// Hook for background data synchronization
export function useBackgroundSync() {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout>();
  const visibilityRef = useRef<boolean>(true);

  useEffect(() => {
    // Prefetch critical data on mount
    prefetchCriticalData();

    // Set up periodic background sync
    const startBackgroundSync = () => {
      intervalRef.current = setInterval(() => {
        // Only sync if page is visible to save bandwidth
        if (visibilityRef.current) {
          console.log('🔄 Background sync: Refreshing critical data');
          
          // Invalidate and refetch critical data
          queryClient.invalidateQueries({
            queryKey: queryKeys.delivery.zones(),
            refetchType: 'active',
          });
          
          queryClient.invalidateQueries({
            queryKey: queryKeys.settings.cutoff(),
            refetchType: 'active',
          });
        }
      }, 5 * 60 * 1000); // Every 5 minutes
    };

    // Handle visibility changes
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      visibilityRef.current = isVisible;

      if (isVisible) {
        console.log('👁️ Page became visible - refreshing data');
        // Refresh data when page becomes visible
        queryClient.invalidateQueries({
          predicate: (query) => {
            // Only refresh queries that are stale
            return query.isStale();
          },
          refetchType: 'active',
        });
        
        // Restart background sync
        if (!intervalRef.current) {
          startBackgroundSync();
        }
      } else {
        console.log('👁️ Page became hidden - pausing background sync');
        // Pause background sync when page is hidden
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
        }
      }
    };

    // Handle online/offline status
    const handleOnline = () => {
      console.log('🌐 Connection restored - refreshing data');
      queryClient.invalidateQueries({
        predicate: (query) => query.state.status === 'error',
        refetchType: 'active',
      });
    };

    const handleOffline = () => {
      console.log('📴 Connection lost - pausing background sync');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };

    // Start background sync
    startBackgroundSync();

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  // Return utility functions
  return {
    forceRefresh: () => {
      console.log('🔄 Force refresh triggered');
      invalidateStaleData();
      queryClient.invalidateQueries({
        refetchType: 'active',
      });
    },
    
    prefetchCritical: prefetchCriticalData,
    
    clearCache: () => {
      queryClient.clear();
    },
  };
}

// Hook for smart prefetching based on user behavior
export function useSmartPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let prefetchTimeout: NodeJS.Timeout;

    // Prefetch on mouse enter (hover intent)
    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link) {
        const href = link.getAttribute('href');
        
        // Clear any existing timeout
        clearTimeout(prefetchTimeout);
        
        // Prefetch after a short delay to avoid unnecessary requests
        prefetchTimeout = setTimeout(() => {
          if (href === '/menu') {
            console.log('🎯 Smart prefetch: Menu page');
            prefetchCriticalData();
          } else if (href === '/cart') {
            console.log('🎯 Smart prefetch: Cart page');
            // Prefetch pricing settings for cart calculations
            queryClient.prefetchQuery({
              queryKey: queryKeys.settings.pricing(),
              queryFn: async () => {
                const response = await fetch('/api/pricing-settings');
                if (!response.ok) throw new Error('Failed to fetch pricing');
                return response.json();
              },
            });
          }
        }, 100); // 100ms delay
      }
    };

    // Cancel prefetch on mouse leave
    const handleMouseLeave = () => {
      clearTimeout(prefetchTimeout);
    };

    // Add event listeners
    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      clearTimeout(prefetchTimeout);
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, [queryClient]);
}
