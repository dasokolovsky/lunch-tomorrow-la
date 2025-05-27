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
    const { orderId, userId, refunded } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({ error: "Order ID and User ID are required" });
    }

    // Get user's phone number from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user?.phone) {
      console.error("Error getting user phone:", userError);
      return res.status(400).json({ error: "User phone number not found" });
    }

    // Create SMS message
    const message = refunded 
      ? `❌ Order #${orderId} has been cancelled and your refund has been processed. You should see the refund in 5-10 business days. Questions? Text (323) 900-5110`
      : `❌ Order #${orderId} has been cancelled. Your refund is being processed and requires admin approval. You'll receive another update soon. Questions? Text (323) 900-5110`;

    // Send SMS
    await client.messages.create({
      to: user.phone,
      from: fromNumber,
      body: message
    });

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Send cancellation notification error:", error);
    res.status(500).json({ error: "Failed to send cancellation notification" });
  }
}
