import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import type { MenuItem } from '@/types';
import type { MenuDayInfo } from '@/utils/menuDayCalculator';

export function useMenuData(menuDayInfo: MenuDayInfo | null) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMenu() {
      // Wait for menu day info to be available
      if (!menuDayInfo) {
        return;
      }

      // If no menus are available, don't try to fetch
      if (!menuDayInfo.hasMenus) {
        setMenuItems([]);
        setLoading(false);
        return;
      }

      // If we have a menu date, fetch it
      if (menuDayInfo.menuDate) {
        setLoading(true);
        setError(null);
        try {
          const menuDate = menuDayInfo.menuDate;
          console.log('📅 Fetching menu for date:', menuDate);

          const { data: menus, error: menuError } = await supabase
            .from("menus")
            .select("id, date")
            .eq("date", menuDate)
            .limit(1);

          if (menuError) {
            setError("Error fetching menu: " + menuError.message);
            setLoading(false);
            return;
          }
          if (!menus || menus.length === 0) {
            console.log('📅 No menu found for date:', menuDate);
            setMenuItems([]);
            setLoading(false);
            return;
          }
          const menuId = menus[0].id;

          const { data: items, error: itemsError } = await supabase
            .from("menu_items")
            .select("*")
            .eq("menu_id", menuId)
            .order("position");

          if (itemsError) {
            setError("Error fetching menu items: " + itemsError.message);
            setMenuItems([]);
          } else {
            console.log('📅 Found', items?.length || 0, 'menu items for', menuDate);
            setMenuItems(items ?? []);
          }
          setLoading(false);
        } catch (err) {
          setError("Unexpected error: " + (err instanceof Error ? err.message : String(err)));
          setLoading(false);
        }
      }
    }
    fetchMenu();
  }, [menuDayInfo]);

  return { menuItems, loading, error };
}
