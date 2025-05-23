import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2022-11-15" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(400).json({ error: "Invalid method" });
    return;
  }
  const { cart, tip, userId, paymentMethodId } = req.body;
  if (!cart || !userId || !paymentMethodId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const amount =
    cart.reduce(
      (sum: number, item: { price_cents: number; quantity: number }) =>
        sum + item.price_cents * item.quantity,
      0
    ) + Math.round((Number(tip) || 0) * 100);

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  const stripeCustomerId = profile?.stripe_customer_id;
  if (!stripeCustomerId) {
    res.status(400).json({ error: "No Stripe customer" });
    return;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: { userId }
    });
    res.status(200).json({ success: true, paymentIntentId: paymentIntent.id });
  } catch (err) {
    res.status(200).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}