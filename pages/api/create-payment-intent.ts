import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const { cart, tip, fees, taxAmount, coupon, saveCard, userId } = req.body;
    if (!cart || !userId) {
      res.status(400).json({ error: "Missing cart or userId" });
      return;
    }

    // Calculate subtotal
    const subtotal = cart.reduce(
      (sum: number, item: { price_cents: number; quantity: number }) =>
        sum + item.price_cents * item.quantity,
      0
    );

    // Calculate fees total
    const feesTotal = (fees || []).reduce((sum: number, fee: any) => sum + Math.round(fee.amount * 100), 0);

    // Calculate discount
    let discountAmount = 0;
    if (coupon) {
      if (coupon.type === 'percentage') {
        discountAmount = Math.round((subtotal / 100) * coupon.amount);
        if (coupon.max_discount_amount) {
          discountAmount = Math.min(discountAmount, Math.round(coupon.max_discount_amount * 100));
        }
      } else {
        discountAmount = Math.round(coupon.amount * 100);
      }
    }

    // Calculate tax (on subtotal + fees - discount)
    const taxableAmount = Math.max(0, subtotal + feesTotal - discountAmount);
    const taxTotal = Math.round(taxableAmount * ((taxAmount || 0) / 100));

    // Calculate tip
    const tipTotal = Math.round((Number(tip) || 0) * 100);

    // Final total
    const amount = Math.max(0, subtotal + feesTotal + taxTotal + tipTotal - discountAmount);

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { supabase_user_id: userId },
      });
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customer.id })
        .eq("id", userId);
      stripeCustomerId = customer.id;
    }

    const params: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: "usd",
      customer: stripeCustomerId,
      metadata: { userId },
    };
    if (saveCard) params.setup_future_usage = "off_session";

    const paymentIntent = await stripe.paymentIntents.create(params);

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    // Always return JSON on error
    console.error("API error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}