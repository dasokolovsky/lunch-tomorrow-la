import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    // Get the order to verify ownership and check if it can be cancelled
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if order can be cancelled
    const nonCancellableStatuses = ['out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    if (nonCancellableStatuses.includes(order.status)) {
      return res.status(400).json({ error: "Order cannot be cancelled in its current status" });
    }

    // Check if we're before the cutoff time to determine refund eligibility
    const now = new Date();
    const deliveryDate = new Date(order.order_date);
    let isEligibleForAutoRefund = false;

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

        // If we're before cutoff, eligible for automatic full refund
        isEligibleForAutoRefund = now <= cutoffDate;
      }
    }

    let refundProcessed = false;
    let newStatus = 'cancelled';

    // Process refund if eligible
    if (isEligibleForAutoRefund && order.stripe_payment_id) {
      try {
        // Process full refund via Stripe
        const refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_id,
          reason: 'requested_by_customer'
        });

        if (refund.status === 'succeeded') {
          refundProcessed = true;
          newStatus = 'refunded';
        }
      } catch (stripeError) {
        console.error("Stripe refund error:", stripeError);
        // Continue with cancellation even if refund fails
        // Admin can process refund manually
      }
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return res.status(500).json({ error: "Failed to cancel order" });
    }

    // Send cancellation SMS notification
    try {
      await fetch(`${req.headers.origin}/api/notifications/send-cancellation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          userId: order.user_id,
          refunded: refundProcessed
        })
      });
    } catch (notificationError) {
      console.error("Failed to send cancellation notification:", notificationError);
      // Don't fail the cancellation if notification fails
    }

    res.status(200).json({
      success: true,
      refunded: refundProcessed,
      message: refundProcessed
        ? "Order cancelled and refund processed"
        : isEligibleForAutoRefund
          ? "Order cancelled. Refund processing may take a few minutes."
          : "Order cancelled. Refund requires admin approval."
    });

  } catch (error) {
    console.error("Order cancel API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
