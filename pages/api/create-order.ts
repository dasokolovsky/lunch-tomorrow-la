import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      cart,
      tip_amount,
      userId,
      address,
      lat,
      lon,
      delivery_window,
      delivery_notes,
      stripe_payment_id,
      delivery_date
    } = req.body;

    // Validate required fields
    if (!cart || !userId || !address || !delivery_window || !stripe_payment_id || !delivery_date) {
      return res.status(400).json({
        error: "Missing required fields: cart, userId, address, delivery_window, stripe_payment_id, delivery_date"
      });
    }

    // Validate delivery date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(delivery_date)) {
      return res.status(400).json({
        error: "Invalid delivery_date format. Expected YYYY-MM-DD"
      });
    }

    // Use the provided delivery date (from menu day calculation)
    const orderDate = delivery_date;

    // Calculate totals
    const itemsTotal = cart.reduce((sum: number, item: any) =>
      sum + (item.price_cents * item.quantity), 0);
    const tipAmount = (tip_amount || 0) * 100; // Convert to cents
    const totalAmount = (itemsTotal + tipAmount) / 100; // Convert back to dollars

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([{
        user_id: userId,
        menu_items: cart,
        order_date: orderDate,
        delivery_window,
        address,
        lat: lat?.toString(),
        lon: lon?.toString(),
        tip_amount: tip_amount || 0,
        tip_percent: 0, // Default to 0% tip
        total_amount: totalAmount,
        delivery_notes: delivery_notes || null,
        status: 'paid',
        stripe_payment_id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return res.status(500).json({ error: "Failed to create order: " + orderError.message });
    }

    console.log("Order created successfully:", order.id);

    // Schedule confirmation SMS to be sent after 2 minutes
    setTimeout(async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send-order-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            userId: order.user_id
          })
        });
      } catch (error) {
        console.error("Failed to send order confirmation SMS:", error);
      }
    }, 2 * 60 * 1000); // 2 minutes delay

    res.status(201).json({
      success: true,
      order_id: order.id,
      order
    });

  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}
