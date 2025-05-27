import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import { queryKeys } from '@/lib/queryClient';
import type { MenuItem } from '@/types';
import type { MenuDayInfo } from '@/utils/menuDayCalculator';

// Fetch menu for a specific date
export function useMenuByDate(menuDate: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.menu.day(menuDate || ''),
    queryFn: async () => {
      if (!menuDate) throw new Error('Menu date is required');

      console.log('📅 Fetching menu for date:', menuDate);

      const { data: menus, error: menuError } = await supabase
        .from("menus")
        .select("id, date")
        .eq("date", menuDate)
        .limit(1);

      if (menuError) {
        throw new Error("Error fetching menu: " + menuError.message);
      }

      if (!menus || menus.length === 0) {
        console.log('📅 No menu found for date:', menuDate);
        return { menu: null, items: [] };
      }

      return { menu: menus[0], items: [] };
    },
    enabled: enabled && !!menuDate,
    staleTime: 10 * 60 * 1000, // 10 minutes - menus don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Fetch menu items for a specific menu
export function useMenuItems(menuId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.menu.items(menuId || ''),
    queryFn: async () => {
      if (!menuId) throw new Error('Menu ID is required');

      const { data: items, error: itemsError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("menu_id", menuId)
        .order("position");

      if (itemsError) {
        throw new Error("Error fetching menu items: " + itemsError.message);
      }

      console.log('📅 Found', items?.length || 0, 'menu items for menu', menuId);
      return items ?? [];
    },
    enabled: enabled && !!menuId,
    staleTime: 15 * 60 * 1000, // 15 minutes - menu items are fairly static
    gcTime: 45 * 60 * 1000, // 45 minutes
  });
}

// Combined hook for menu and items
export function useMenuData(menuDayInfo: MenuDayInfo | null) {
  const menuDate = menuDayInfo?.menuDate || null;
  const hasMenus = menuDayInfo?.hasMenus;

  // Fetch menu
  const menuQuery = useMenuByDate(menuDate, !!hasMenus);

  // Fetch menu items (only if we have a menu)
  const itemsQuery = useMenuItems(
    menuQuery.data?.menu?.id,
    !!menuQuery.data?.menu?.id
  );

  return {
    menuItems: itemsQuery.data || [],
    loading: menuQuery.isLoading || itemsQuery.isLoading,
    error: menuQuery.error?.message || itemsQuery.error?.message || null,
    isRefetching: menuQuery.isRefetching || itemsQuery.isRefetching,
    refetch: () => {
      menuQuery.refetch();
      if (menuQuery.data?.menu?.id) {
        itemsQuery.refetch();
      }
    },
  };
}

// Mutation for creating/updating menu items (admin)
export function useCreateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (menuItem: Omit<MenuItem, 'id'>) => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(menuItem)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate menu items cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.menu.items(data.menu_id)
      });

      // Optionally update the cache directly
      queryClient.setQueryData(
        queryKeys.menu.items(data.menu_id),
        (old: MenuItem[] | undefined) => {
          if (!old) return [data];
          return [...old, data].sort((a, b) => a.position - b.position);
        }
      );
    },
  });
}

// Mutation for updating menu items
export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<MenuItem> }) => {
      const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Update the specific item in cache
      queryClient.setQueryData(
        queryKeys.menu.items(data.menu_id),
        (old: MenuItem[] | undefined) => {
          if (!old) return [data];
          return old.map(item => item.id === data.id ? data : item);
        }
      );
    },
  });
}

// Mutation for deleting menu items
export function useDeleteMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, menuId }: { id: number; menuId: string }) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, menuId };
    },
    onSuccess: ({ id, menuId }) => {
      // Remove the item from cache
      queryClient.setQueryData(
        queryKeys.menu.items(menuId),
        (old: MenuItem[] | undefined) => {
          if (!old) return [];
          return old.filter(item => item.id !== id);
        }
      );
    },
  });
}
