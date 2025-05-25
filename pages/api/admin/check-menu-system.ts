import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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
      database_status: "checking...",
      tables: {},
      data_summary: {},
      errors: []
    };

    // Check if tables exist and get their structure
    try {
      // Check menus table
      const { data: menusData, error: menusError } = await supabase
        .from('menus')
        .select('*')
        .limit(10);

      if (menusError) {
        results.errors.push(`Menus table error: ${menusError.message}`);
        results.tables.menus = { exists: false, error: menusError.message };
      } else {
        results.tables.menus = { 
          exists: true, 
          count: menusData?.length || 0,
          sample_data: menusData?.slice(0, 3) || []
        };
      }

      // Check menu_items table
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .limit(10);

      if (itemsError) {
        results.errors.push(`Menu items table error: ${itemsError.message}`);
        results.tables.menu_items = { exists: false, error: itemsError.message };
      } else {
        results.tables.menu_items = { 
          exists: true, 
          count: itemsData?.length || 0,
          sample_data: itemsData?.slice(0, 3) || []
        };
      }

      // Get total counts
      const { count: totalMenus } = await supabase
        .from('menus')
        .select('*', { count: 'exact', head: true });

      const { count: totalItems } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true });

      results.data_summary = {
        total_menus: totalMenus || 0,
        total_menu_items: totalItems || 0
      };

      // Get recent menus with items
      const { data: recentMenus, error: recentError } = await supabase
        .from('menus')
        .select(`
          id,
          date,
          created_at,
          menu_items (
            id,
            name,
            description,
            price_cents,
            position
          )
        `)
        .order('date', { ascending: false })
        .limit(5);

      if (!recentError && recentMenus) {
        results.recent_menus = recentMenus;
      }

      // Check for future menus
      const today = new Date().toISOString().split('T')[0];
      const { data: futureMenus, error: futureError } = await supabase
        .from('menus')
        .select('id, date')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(10);

      if (!futureError && futureMenus) {
        results.future_menus = futureMenus;
      }

      results.database_status = "connected";

    } catch (error) {
      results.errors.push(`Database connection error: ${error}`);
      results.database_status = "error";
    }

    res.status(200).json(results);

  } catch (error) {
    console.error('Error checking menu system:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
