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
    // Get all users from auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      return res.status(500).json({ error: authError.message });
    }

    // Get user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Get user order statistics
    const { data: orderStats, error: orderStatsError } = await supabase
      .from('orders')
      .select(`
        user_id,
        total_amount,
        order_date,
        created_at
      `);

    if (orderStatsError) {
      console.error('Error fetching order stats:', orderStatsError);
    }

    // Get user address counts
    const { data: addressCounts, error: addressError } = await supabase
      .from('user_addresses')
      .select('user_id');

    if (addressError) {
      console.error('Error fetching address counts:', addressError);
    }

    // Process and combine data
    const users = authData.users
      .filter(user => user.phone) // Only include users with phone numbers
      .map(user => {
        const profile = profiles?.find(p => p.id === user.id);
        const userOrders = orderStats?.filter(order => order.user_id === user.id) || [];
        const userAddresses = addressCounts?.filter(addr => addr.user_id === user.id) || [];

        // Calculate user statistics
        const totalSpent = userOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const orderCount = userOrders.length;
        const lastOrderDate = userOrders.length > 0 
          ? userOrders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())[0].order_date
          : null;

        return {
          id: user.id,
          phone: user.phone,
          email: user.email,
          full_name: profile?.full_name || null,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          profile: profile ? {
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            created_at: profile.created_at
          } : null,
          stats: {
            order_count: orderCount,
            total_spent: totalSpent,
            last_order_date: lastOrderDate,
            address_count: userAddresses.length
          }
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.status(200).json({ users });

  } catch (error) {
    console.error('Error in users-comprehensive:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
