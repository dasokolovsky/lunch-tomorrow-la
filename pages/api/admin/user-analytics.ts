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
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get all users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      return res.status(500).json({ error: authError.message });
    }

    const allUsers = authData.users.filter(user => user.phone);
    const totalUsers = allUsers.length;

    // Get new users (last 30 days)
    const newUsers = allUsers.filter(user =>
      new Date(user.created_at) > thirtyDaysAgo
    );

    // Get users from previous period for growth calculation
    const usersFromSixtyDays = allUsers.filter(user =>
      new Date(user.created_at) > sixtyDaysAgo
    );
    const usersFromPreviousPeriod = usersFromSixtyDays.length - newUsers.length;

    // Calculate growth rate
    const growthRate = usersFromPreviousPeriod > 0
      ? ((newUsers.length / usersFromPreviousPeriod) * 100)
      : newUsers.length > 0 ? 100 : 0;

    // Get all orders for analysis
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('user_id, total_amount, order_date, created_at');

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return res.status(500).json({ error: 'Failed to fetch order data' });
    }

    // Calculate user statistics
    const userOrderStats = new Map();
    let totalRevenue = 0;

    orders?.forEach(order => {
      const userId = order.user_id;
      const amount = order.total_amount || 0;
      totalRevenue += amount;

      if (!userOrderStats.has(userId)) {
        userOrderStats.set(userId, {
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: null
        });
      }

      const stats = userOrderStats.get(userId);
      stats.orderCount += 1;
      stats.totalSpent += amount;

      const orderDate = new Date(order.order_date);
      if (!stats.lastOrderDate || orderDate > new Date(stats.lastOrderDate)) {
        stats.lastOrderDate = order.order_date;
      }
    });

    // Count active users (ordered in last 45 days)
    const activeUsers = Array.from(userOrderStats.entries()).filter(([, stats]) =>
      stats.lastOrderDate && new Date(stats.lastOrderDate) > fortyFiveDaysAgo
    ).length;

    // Count VIP users ($300+ spent OR 8+ orders)
    const vipUsers = Array.from(userOrderStats.entries()).filter(([, stats]) =>
      stats.totalSpent >= 300 || stats.orderCount >= 8
    ).length;

    // Calculate averages
    const usersWithOrders = userOrderStats.size;
    const avgOrdersPerUser = usersWithOrders > 0
      ? Array.from(userOrderStats.values()).reduce((sum, stats) => sum + stats.orderCount, 0) / usersWithOrders
      : 0;

    const avgSpentPerUser = usersWithOrders > 0
      ? Array.from(userOrderStats.values()).reduce((sum, stats) => sum + stats.totalSpent, 0) / usersWithOrders
      : 0;

    const analytics = {
      total_users: totalUsers,
      new_users_this_month: newUsers.length,
      active_users: activeUsers,
      vip_users: vipUsers,
      growth_rate: Math.round(growthRate * 100) / 100,
      avg_orders_per_user: Math.round(avgOrdersPerUser * 100) / 100,
      avg_spent_per_user: Math.round(avgSpentPerUser * 100) / 100,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      users_with_orders: usersWithOrders,
      conversion_rate: totalUsers > 0 ? Math.round((usersWithOrders / totalUsers) * 10000) / 100 : 0
    };

    res.status(200).json(analytics);

  } catch (error) {
    console.error('Error in user-analytics:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
