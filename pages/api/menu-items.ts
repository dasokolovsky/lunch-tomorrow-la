import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { date } = req.query;

    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Date parameter is required" });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    // First, find the menu for the given date
    const { data: menus, error: menuError } = await supabaseAdmin
      .from("menus")
      .select("id, date")
      .eq("date", date)
      .limit(1);

    if (menuError) {
      console.error("Error fetching menu:", menuError);
      return res.status(500).json({ error: menuError.message });
    }

    if (!menus || menus.length === 0) {
      // No menu found for this date - return empty array
      return res.status(200).json([]);
    }

    const menuId = menus[0].id;

    // Fetch menu items for this menu
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("menu_items")
      .select("*")
      .eq("menu_id", menuId)
      .order("position");

    if (itemsError) {
      console.error("Error fetching menu items:", itemsError);
      return res.status(500).json({ error: itemsError.message });
    }

    res.status(200).json(items || []);
  } catch (error) {
    console.error("Menu items API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
