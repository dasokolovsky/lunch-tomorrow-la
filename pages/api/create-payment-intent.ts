import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2022-11-15" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(400).json({ error: "Invalid method" });
    return;
  }
  const { cart, tip, saveCard, userId } = req.body;
  if (!cart || !userId) {
    res.status(400).json({ error: "Missing cart or userId" });
    return;
  }

  const amount = cart.reduce(
    (sum, item) => sum + item.price_cents * item.quantity, 0
  ) + Math.round((Number(tip) || 0) * 100);

  let { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  let stripeCustomerId = profile?.stripe_customer_id;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ metadata: { supabase_user_id: userId } });
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
}