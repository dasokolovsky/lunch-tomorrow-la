import { NextApiRequest, NextApiResponse } from "next";

// Default SMS templates
const defaultTemplates = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    category: 'welcome' as const,
    message: 'Welcome to LunchTomorrow! 🍽️ Thanks for joining us. Order fresh, delicious meals delivered right to your door. Place your first order today!'
  },
  {
    id: 'reminder',
    name: 'Order Reminder',
    category: 'reminder' as const,
    message: 'Don\'t forget to place your order for tomorrow\'s lunch! ⏰ Ordering closes at 6:00 PM today. Order now to secure your meal!'
  },
  {
    id: 'promotion-10',
    name: '10% Off Promotion',
    category: 'promotion' as const,
    message: '🎉 Special offer just for you! Get 10% off your next order with code SAVE10. Valid until this Sunday. Order now!'
  },
  {
    id: 'promotion-5',
    name: '$5 Off Promotion',
    category: 'promotion' as const,
    message: '💰 Save $5 on orders over $25! Use code SAVE5 at checkout. Fresh meals, great savings. Order today!'
  },
  {
    id: 'reengagement',
    name: 'We Miss You',
    category: 'reengagement' as const,
    message: 'We miss you! 😊 It\'s been a while since your last order. Come back and try our new menu items. Use code WELCOME10 for 10% off!'
  },
  {
    id: 'announcement',
    name: 'Menu Update',
    category: 'announcement' as const,
    message: '🍽️ New menu items are here! Check out our latest delicious additions. Fresh ingredients, amazing flavors. Order now!'
  },
  {
    id: 'holiday',
    name: 'Holiday Greeting',
    category: 'announcement' as const,
    message: '🎄 Happy Holidays from LunchTomorrow! Thank you for being a valued customer. Enjoy special holiday menu items this week!'
  },
  {
    id: 'feedback',
    name: 'Feedback Request',
    category: 'announcement' as const,
    message: 'How was your recent order? 📝 We\'d love to hear your feedback! Reply to this message or contact us. Your opinion matters!'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Return default templates
    // In the future, this could be enhanced to store custom templates in the database
    res.status(200).json({ templates: defaultTemplates });
  } else if (req.method === "POST") {
    // Future: Add custom template creation
    res.status(501).json({ error: "Custom template creation not yet implemented" });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
