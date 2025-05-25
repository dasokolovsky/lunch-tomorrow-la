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

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // Get user's recent orders (last 10)
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_date,
        total_amount,
        status,
        delivery_window,
        address,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('Error fetching user orders:', ordersError);
    }

    // Get user's saved addresses
    const { data: addresses, error: addressError } = await supabase
      .from('user_addresses')
      .select(`
        id,
        display_name,
        address_line_1,
        address_line_2,
        city,
        state,
        zip,
        is_primary,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (addressError) {
      console.error('Error fetching user addresses:', addressError);
    }

    // Format the response
    const response = {
      recent_orders: recentOrders?.map(order => ({
        id: order.id,
        order_date: order.order_date,
        total_amount: order.total_amount || 0,
        status: order.status,
        delivery_window: order.delivery_window,
        address: order.address,
        created_at: order.created_at
      })) || [],
      addresses: addresses?.map(addr => ({
        id: addr.id,
        display_name: addr.display_name,
        full_address: [
          addr.address_line_1,
          addr.address_line_2,
          `${addr.city}, ${addr.state} ${addr.zip}`
        ].filter(Boolean).join(', '),
        is_primary: addr.is_primary,
        created_at: addr.created_at
      })) || []
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in user-details:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
