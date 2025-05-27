import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderId } = req.query;
    const { delivery_window } = req.body;

    if (!orderId || !delivery_window) {
      return res.status(400).json({ error: "Order ID and delivery window are required" });
    }

    // Get the order to verify ownership and check if it can be edited
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if order can be edited (not out for delivery, delivered, cancelled, or refunded)
    const nonEditableStatuses = ['out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    if (nonEditableStatuses.includes(order.status)) {
      return res.status(400).json({ error: "Order cannot be edited in its current status" });
    }

    // Check if we're before the cutoff time for the delivery date
    const now = new Date();
    const deliveryDate = new Date(order.order_date);

    // Get cutoff times from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('setting_value')
      .eq('setting_key', 'order_cutoff_times')
      .single();

    if (settings?.setting_value) {
      const cutoffTimes = settings.setting_value;
      const dayOfWeek = deliveryDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const cutoffTime = cutoffTimes[dayOfWeek];

      if (cutoffTime) {
        // Create cutoff datetime (day before delivery at cutoff time)
        const cutoffDate = new Date(deliveryDate);
        cutoffDate.setDate(cutoffDate.getDate() - 1);
        const [hours, minutes] = cutoffTime.split(':');
        cutoffDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (now > cutoffDate) {
          return res.status(400).json({ error: "Cannot edit order after cutoff time" });
        }
      }
    }

    // Update the delivery window
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        delivery_window,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return res.status(500).json({ error: "Failed to update order" });
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Order edit API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
