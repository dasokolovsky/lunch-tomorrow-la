import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Use the service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sampleMenuItems = [
  {
    name: "Mediterranean Quinoa Bowl",
    description: "Quinoa with roasted vegetables, chickpeas, feta cheese, and tahini dressing",
    price_cents: 1399
  },
  {
    name: "BBQ Pulled Pork Sandwich",
    description: "Slow-cooked pulled pork with BBQ sauce on brioche bun, served with coleslaw",
    price_cents: 1299
  },
  {
    name: "Asian Chicken Salad",
    description: "Mixed greens with grilled chicken, mandarin oranges, almonds, and sesame dressing",
    price_cents: 1199
  },
  {
    name: "Margherita Flatbread",
    description: "Fresh mozzarella, tomatoes, basil, and balsamic glaze on artisan flatbread",
    price_cents: 1099
  },
  {
    name: "Turkey & Avocado Wrap",
    description: "Sliced turkey, avocado, lettuce, tomato, and chipotle mayo in spinach tortilla",
    price_cents: 1149
  },
  {
    name: "Beef & Broccoli Bowl",
    description: "Tender beef with steamed broccoli over jasmine rice with teriyaki sauce",
    price_cents: 1449
  },
  {
    name: "Caprese Panini",
    description: "Fresh mozzarella, tomatoes, basil pesto on grilled ciabatta bread",
    price_cents: 1099
  },
  {
    name: "Thai Curry Chicken",
    description: "Coconut curry chicken with vegetables served over basmati rice",
    price_cents: 1349
  },
  {
    name: "Greek Gyro Bowl",
    description: "Seasoned lamb with tzatziki, cucumber, tomatoes, and pita bread",
    price_cents: 1399
  },
  {
    name: "Veggie Power Bowl",
    description: "Roasted sweet potato, kale, quinoa, avocado, and lemon vinaigrette",
    price_cents: 1249
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST to create menus." });
  }

  try {
    const results: any = {
      created_menus: [],
      created_items: [],
      errors: []
    };

    // Get the next 7 days starting from today
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
    }

    for (const date of dates) {
      try {
        // Check if menu already exists for this date
        const { data: existingMenu, error: checkError } = await supabase
          .from('menus')
          .select('id')
          .eq('date', date)
          .single();

        let menuId: number;

        if (checkError && checkError.code === 'PGRST116') {
          // No menu exists, create one
          const { data: newMenu, error: createError } = await supabase
            .from('menus')
            .insert([{ date }])
            .select('id')
            .single();

          if (createError) {
            results.errors.push(`Error creating menu for ${date}: ${createError.message}`);
            continue;
          }

          menuId = newMenu.id;
          results.created_menus.push({ date, id: menuId, status: 'created' });
        } else if (existingMenu) {
          // Menu exists, use existing ID
          menuId = existingMenu.id;
          results.created_menus.push({ date, id: menuId, status: 'existing' });
        } else {
          results.errors.push(`Error checking menu for ${date}: ${checkError?.message}`);
          continue;
        }

        // Check if menu items already exist for this menu
        const { data: existingItems, error: itemsCheckError } = await supabase
          .from('menu_items')
          .select('id')
          .eq('menu_id', menuId);

        if (itemsCheckError) {
          results.errors.push(`Error checking items for ${date}: ${itemsCheckError.message}`);
          continue;
        }

        if (existingItems && existingItems.length > 0) {
          results.created_items.push({
            date,
            menu_id: menuId,
            count: existingItems.length,
            status: 'existing'
          });
          continue;
        }

        // Create 2-4 random menu items for this date
        const itemCount = Math.floor(Math.random() * 3) + 2; // 2-4 items
        const selectedItems = sampleMenuItems
          .sort(() => 0.5 - Math.random())
          .slice(0, itemCount);

        const menuItemsToCreate = selectedItems.map((item, index) => ({
          menu_id: menuId,
          name: item.name,
          description: item.description,
          price_cents: item.price_cents,
          image_url: `https://placehold.co/400x300/f3f4f6/9ca3af.png?text=${encodeURIComponent(item.name.split(' ')[0])}`,
          position: index + 1
        }));

        const { data: createdItems, error: createItemsError } = await supabase
          .from('menu_items')
          .insert(menuItemsToCreate)
          .select('id, name');

        if (createItemsError) {
          results.errors.push(`Error creating items for ${date}: ${createItemsError.message}`);
        } else {
          results.created_items.push({
            date,
            menu_id: menuId,
            count: createdItems?.length || 0,
            items: createdItems,
            status: 'created'
          });
        }

      } catch (error) {
        results.errors.push(`Error processing ${date}: ${error}`);
      }
    }

    results.summary = {
      dates_processed: dates.length,
      menus_created: results.created_menus.filter(m => m.status === 'created').length,
      menus_existing: results.created_menus.filter(m => m.status === 'existing').length,
      items_created: results.created_items.filter(i => i.status === 'created').length,
      items_existing: results.created_items.filter(i => i.status === 'existing').length,
      total_errors: results.errors.length
    };

    res.status(200).json(results);

  } catch (error) {
    console.error('Error setting up menus:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
