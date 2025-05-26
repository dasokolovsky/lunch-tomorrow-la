import { queryClient, queryKeys } from '@/lib/queryClient';

// Prefetch critical data for better user experience
export async function prefetchCriticalData() {
  const prefetchPromises = [
    // Prefetch delivery zones (needed for address validation)
    queryClient.prefetchQuery({
      queryKey: queryKeys.delivery.zones(),
      queryFn: async () => {
        const response = await fetch("/api/delivery-zones");
        if (!response.ok) {
          throw new Error('Failed to fetch delivery zones');
        }
        return response.json();
      },
      staleTime: 30 * 60 * 1000, // 30 minutes
    }),

    // Prefetch order settings (needed for cutoff times)
    queryClient.prefetchQuery({
      queryKey: queryKeys.settings.cutoff(),
      queryFn: async () => {
        const response = await fetch('/api/settings');
        if (!response.ok) {
          throw new Error('Failed to load settings');
        }
        return response.json();
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  ];

  try {
    await Promise.allSettled(prefetchPromises);
    console.log('✅ Critical data prefetched successfully');
  } catch (error) {
    console.warn('⚠️ Some critical data failed to prefetch:', error);
  }
}

// Prefetch menu data for a specific date
export async function prefetchMenuData(menuDate: string) {
  try {
    // First prefetch the menu
    const menuData = await queryClient.fetchQuery({
      queryKey: queryKeys.menu.day(menuDate),
      queryFn: async () => {
        const response = await fetch(`/api/menu?date=${menuDate}`);
        if (!response.ok) {
          throw new Error('Failed to fetch menu');
        }
        return response.json();
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    });

    // If we have a menu, prefetch its items
    if (menuData?.menu?.id) {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.menu.items(menuData.menu.id),
        queryFn: async () => {
          const response = await fetch(`/api/menu-items?menuId=${menuData.menu.id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch menu items');
          }
          return response.json();
        },
        staleTime: 15 * 60 * 1000, // 15 minutes
      });
    }

    console.log(`✅ Menu data for ${menuDate} prefetched successfully`);
  } catch (error) {
    console.warn(`⚠️ Failed to prefetch menu data for ${menuDate}:`, error);
  }
}

// Prefetch user-specific data when authenticated
export async function prefetchUserData(userId: string) {
  const prefetchPromises = [
    // Prefetch user profile
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.profile(userId),
      queryFn: async () => {
        const response = await fetch(`/api/user/profile`);
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        return response.json();
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    }),

    // Prefetch user addresses
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.addresses(userId),
      queryFn: async () => {
        const response = await fetch(`/api/user/addresses`);
        if (!response.ok) {
          throw new Error('Failed to fetch user addresses');
        }
        return response.json();
      },
      staleTime: 15 * 60 * 1000, // 15 minutes
    }),

    // Prefetch recent orders
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.orders(userId),
      queryFn: async () => {
        const response = await fetch(`/api/user/orders?limit=10`);
        if (!response.ok) {
          throw new Error('Failed to fetch user orders');
        }
        return response.json();
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  ];

  try {
    await Promise.allSettled(prefetchPromises);
    console.log('✅ User data prefetched successfully');
  } catch (error) {
    console.warn('⚠️ Some user data failed to prefetch:', error);
  }
}

// Invalidate stale data (useful for real-time updates)
export function invalidateStaleData() {
  // Invalidate menu data (in case of updates)
  queryClient.invalidateQueries({
    queryKey: queryKeys.menu.all,
    refetchType: 'none', // Don't refetch immediately
  });

  // Invalidate delivery zones (in case of updates)
  queryClient.invalidateQueries({
    queryKey: queryKeys.delivery.all,
    refetchType: 'none',
  });

  console.log('🔄 Stale data invalidated');
}

// Clear all cached data (useful for logout)
export function clearAllCachedData() {
  queryClient.clear();
  console.log('🗑️ All cached data cleared');
}

// Get cache statistics for debugging
export function getCacheStats() {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  const stats = {
    totalQueries: queries.length,
    staleQueries: queries.filter(q => q.isStale()).length,
    fetchingQueries: queries.filter(q => q.isFetching()).length,
    errorQueries: queries.filter(q => q.state.status === 'error').length,
    cacheSize: JSON.stringify(cache).length,
  };

  console.log('📊 Cache Statistics:', stats);
  return stats;
}
