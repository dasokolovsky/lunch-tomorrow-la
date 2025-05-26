import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import type { OrderCutoffTimes } from '../../pages/api/settings';

// Fetch order cutoff times and settings
export function useOrderSettings() {
  return useQuery({
    queryKey: queryKeys.settings.cutoff(),
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 3, // Important data, retry more
  });
}

// Fetch pricing settings
export function usePricingSettings() {
  return useQuery({
    queryKey: queryKeys.settings.pricing(),
    queryFn: async () => {
      const response = await fetch('/api/pricing-settings');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - pricing doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Calculate pricing for an order
export function usePricingCalculation() {
  return useMutation({
    mutationFn: async ({ subtotal, deliveryZoneId }: { subtotal: number; deliveryZoneId?: string }) => {
      const response = await fetch('/api/pricing-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subtotal,
          delivery_zone_id: deliveryZoneId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    // Don't cache pricing calculations as they depend on dynamic inputs
  });
}

// Update order cutoff times (admin)
export function useUpdateOrderSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: { order_cutoff_times: OrderCutoffTimes }) => {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate settings cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.cutoff()
      });
    },
  });
}

// Update pricing settings (admin)
export function useUpdatePricingSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch('/api/admin/pricing-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update pricing settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate pricing settings cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.pricing()
      });
    },
  });
}

// Prefetch settings (useful for app initialization)
export function usePrefetchSettings() {
  const queryClient = useQueryClient();
  
  return {
    prefetchOrderSettings: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.settings.cutoff(),
        queryFn: async () => {
          const response = await fetch('/api/settings');
          if (!response.ok) {
            throw new Error('Failed to load settings');
          }
          return response.json();
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    
    prefetchPricingSettings: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.settings.pricing(),
        queryFn: async () => {
          const response = await fetch('/api/pricing-settings');
          if (!response.ok) {
            throw new Error('Failed to load pricing settings');
          }
          return response.json();
        },
        staleTime: 10 * 60 * 1000,
      });
    },
  };
}
