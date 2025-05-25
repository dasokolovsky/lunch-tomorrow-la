import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { calculateMenuDay, getDefaultCutoffTimes } from "@/utils/menuDayCalculator";

// Use the service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const results: any = {
      menu_day_calculation: {},
      current_menu_check: {},
      admin_flow_test: {},
      customer_flow_test: {},
      errors: []
    };

    // Test 1: Menu day calculation
    try {
      // Get current cutoff times from settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', 'order_cutoff_times')
        .single();

      const cutoffTimes = settingsData?.setting_value || getDefaultCutoffTimes();
      const menuDayInfo = await calculateMenuDay(cutoffTimes);

      results.menu_day_calculation = {
        success: true,
        current_cutoff_times: cutoffTimes,
        calculated_menu_day: menuDayInfo
      };
    } catch (error) {
      results.errors.push(`Menu day calculation error: ${error}`);
      results.menu_day_calculation = { success: false, error: String(error) };
    }

    // Test 2: Check if current menu exists
    try {
      const menuDate = results.menu_day_calculation.calculated_menu_day?.menuDate;
      if (menuDate) {
        const { data: currentMenu, error: menuError } = await supabase
          .from('menus')
          .select(`
            id,
            date,
            menu_items (
              id,
              name,
              description,
              price_cents,
              image_url,
              position
            )
          `)
          .eq('date', menuDate)
          .single();

        if (menuError && menuError.code !== 'PGRST116') { // PGRST116 = no rows returned
          results.errors.push(`Current menu check error: ${menuError.message}`);
        }

        results.current_menu_check = {
          menu_date: menuDate,
          menu_exists: !!currentMenu,
          menu_data: currentMenu || null,
          item_count: currentMenu?.menu_items?.length || 0
        };
      }
    } catch (error) {
      results.errors.push(`Current menu check error: ${error}`);
    }

    // Test 3: Admin flow test - check if we can create/read menu items
    try {
      // Test reading all menus
      const { data: allMenus, error: allMenusError } = await supabase
        .from('menus')
        .select('id, date')
        .order('date', { ascending: false })
        .limit(5);

      if (allMenusError) {
        results.errors.push(`Admin read test error: ${allMenusError.message}`);
      }

      // Test reading all menu items
      const { data: allItems, error: allItemsError } = await supabase
        .from('menu_items')
        .select('id, name, menu_id, price_cents')
        .limit(10);

      if (allItemsError) {
        results.errors.push(`Admin items read test error: ${allItemsError.message}`);
      }

      results.admin_flow_test = {
        can_read_menus: !allMenusError,
        menu_count: allMenus?.length || 0,
        can_read_items: !allItemsError,
        item_count: allItems?.length || 0,
        recent_menus: allMenus || []
      };
    } catch (error) {
      results.errors.push(`Admin flow test error: ${error}`);
    }

    // Test 4: Customer flow test - simulate API calls customer would make
    try {
      const menuDate = results.menu_day_calculation.calculated_menu_day?.menuDate;
      if (menuDate) {
        // Test the menu-items API endpoint
        const response = await fetch(`${req.headers.origin || 'http://localhost:3001'}/api/menu-items?date=${menuDate}`);
        const menuItems = await response.json();

        results.customer_flow_test = {
          api_accessible: response.ok,
          menu_date_tested: menuDate,
          items_returned: Array.isArray(menuItems) ? menuItems.length : 0,
          sample_items: Array.isArray(menuItems) ? menuItems.slice(0, 2) : menuItems
        };
      }
    } catch (error) {
      results.errors.push(`Customer flow test error: ${error}`);
    }

    // Summary
    results.summary = {
      database_connected: results.admin_flow_test.can_read_menus,
      menu_calculation_working: results.menu_day_calculation.success,
      current_menu_available: results.current_menu_check.menu_exists,
      api_endpoints_working: results.customer_flow_test.api_accessible,
      total_errors: results.errors.length
    };

    res.status(200).json(results);

  } catch (error) {
    console.error('Error testing menu flow:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
