import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_FROM_NUMBER!;

const client = twilio(accountSid, authToken);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({ error: "Order ID and User ID are required" });
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Get user's phone number from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user?.phone) {
      console.error("Error getting user phone:", userError);
      return res.status(400).json({ error: "User phone number not found" });
    }

    // Create short link for order page
    const orderLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://lunchtomorrow.la'}/order/${orderId}`;

    // Create SMS message
    const message = `🚚 Your order #${orderId} is out for delivery! Expected delivery during your ${order.delivery_window} window. Track your order: ${orderLink}`;

    // Send SMS
    await client.messages.create({
      to: user.phone,
      from: fromNumber,
      body: message
    });

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Send out for delivery notification error:", error);
    res.status(500).json({ error: "Failed to send delivery notification" });
  }
}
