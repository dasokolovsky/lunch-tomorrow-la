import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get today's date and next few days
    const today = new Date();
    const dates: string[] = [];

    // Create menu items for today and next 7 days
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const testMenuItems = [
      {
        name: "Grilled Chicken Caesar Salad",
        description: "Fresh romaine lettuce, grilled chicken breast, parmesan cheese, croutons, and caesar dressing",
        price_cents: 1299,
        image_url: "https://placehold.co/400x300/f3f4f6/9ca3af.png?text=Caesar+Salad"
      },
      {
        name: "Turkey Club Sandwich",
        description: "Sliced turkey, bacon, lettuce, tomato, and mayo on toasted bread with chips",
        price_cents: 1199,
        image_url: "https://placehold.co/400x300/f3f4f6/9ca3af.png?text=Turkey+Club"
      },
      {
        name: "Vegetarian Buddha Bowl",
        description: "Quinoa, roasted vegetables, chickpeas, avocado, and tahini dressing",
        price_cents: 1399,
        image_url: "https://placehold.co/400x300/f3f4f6/9ca3af.png?text=Buddha+Bowl"
      },
      {
        name: "Beef Stir Fry",
        description: "Tender beef strips with mixed vegetables and jasmine rice",
        price_cents: 1499,
        image_url: "https://placehold.co/400x300/f3f4f6/9ca3af.png?text=Beef+Stir+Fry"
      },
      {
        name: "Margherita Pizza Slice",
        description: "Fresh mozzarella, tomato sauce, and basil on crispy crust",
        price_cents: 899,
        image_url: "https://placehold.co/400x300/f3f4f6/9ca3af.png?text=Margherita+Pizza"
      }
    ];

    let totalItemsCreated = 0;

    // Create menus and menu items for each date
    for (const date of dates) {
      // First, create or get the menu for this date
      let menuId;

      // Check if menu already exists for this date
      const { data: existingMenus, error: menuCheckError } = await supabase
        .from('menus')
        .select('id')
        .eq('date', date)
        .limit(1);

      if (menuCheckError) {
        console.error('Error checking existing menus:', menuCheckError);
        continue;
      }

      if (existingMenus && existingMenus.length > 0) {
        menuId = existingMenus[0].id;
      } else {
        // Create new menu for this date
        const { data: newMenu, error: menuCreateError } = await supabase
          .from('menus')
          .insert([{ date }])
          .select('id')
          .single();

        if (menuCreateError) {
          console.error('Error creating menu for date', date, ':', menuCreateError);
          continue;
        }
        menuId = newMenu.id;
      }

      // Now create menu items for this menu
      const menuItemsForDate = testMenuItems.map((item, index) => ({
        menu_id: menuId,
        name: item.name,
        description: item.description,
        price_cents: item.price_cents,
        image_url: item.image_url,
        position: index + 1
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from('menu_items')
        .insert(menuItemsForDate)
        .select();

      if (itemsError) {
        console.error('Error creating menu items for date', date, ':', itemsError);
        continue;
      }

      totalItemsCreated += createdItems?.length || 0;
    }

    res.status(200).json({
      success: true,
      message: `Created ${totalItemsCreated} test menu items for ${dates.length} days`,
      dates: dates,
      itemsPerDay: testMenuItems.length,
      totalItems: totalItemsCreated
    });

  } catch (error) {
    console.error('Error in create-test-menu-items:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
