import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import type { DeliveryZone } from '@/types';

// Fetch delivery zones
export function useDeliveryZones() {
  return useQuery({
    queryKey: queryKeys.delivery.zones(),
    queryFn: async () => {
      const response = await fetch("/api/delivery-zones");
      if (!response.ok) {
        throw new Error('Failed to fetch delivery zones');
      }
      return response.json() as Promise<DeliveryZone[]>;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - zones don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 3, // Retry more times for critical data
  });
}

// Validate delivery address
export function useDeliveryValidation(lat?: number, lon?: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.delivery.validation(lat || 0, lon || 0),
    queryFn: async () => {
      if (!lat || !lon) throw new Error('Coordinates required');
      
      // This would typically call your delivery validation API
      // For now, we'll use the existing client-side logic
      const zonesResponse = await fetch("/api/delivery-zones");
      const zones = await zonesResponse.json();
      
      // Import the validation logic
      const { getDeliveryInfo } = await import('@/utils/zoneCheck');
      const point: GeoJSON.Point = { type: "Point", coordinates: [lon, lat] };
      
      return getDeliveryInfo(point, zones);
    },
    enabled: enabled && !!lat && !!lon,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Mutation for creating delivery zones (admin)
export function useCreateDeliveryZone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (zone: Omit<DeliveryZone, 'id'>) => {
      const response = await fetch('/api/admin/delivery-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zone),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create delivery zone');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch delivery zones
      queryClient.invalidateQueries({
        queryKey: queryKeys.delivery.zones()
      });
      
      // Also invalidate any validation queries since zones changed
      queryClient.invalidateQueries({
        queryKey: queryKeys.delivery.all
      });
    },
  });
}

// Mutation for updating delivery zones
export function useUpdateDeliveryZone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DeliveryZone> }) => {
      const response = await fetch(`/api/admin/delivery-zones/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update delivery zone');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.delivery.all
      });
    },
  });
}

// Mutation for deleting delivery zones
export function useDeleteDeliveryZone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/delivery-zones/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete delivery zone');
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.delivery.all
      });
    },
  });
}

// Prefetch delivery zones (useful for preloading)
export function usePrefetchDeliveryZones() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.delivery.zones(),
      queryFn: async () => {
        const response = await fetch("/api/delivery-zones");
        if (!response.ok) {
          throw new Error('Failed to fetch delivery zones');
        }
        return response.json();
      },
      staleTime: 30 * 60 * 1000,
    });
  };
}
