import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

interface CartItem {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  quantity: number;
  image_url?: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cart }: { cart: CartItem[] } = req.body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: cart.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            images: item.image_url ? [item.image_url] : [],
            description: item.description || undefined,
          },
          unit_amount: item.price_cents, // price_cents is in cents
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: `${req.headers.origin}/cart?success=1`,
      cancel_url: `${req.headers.origin}/cart?canceled=1`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
}