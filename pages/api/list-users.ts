import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Use the service role key on the server only!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use the Supabase Admin API to fetch users (not .from!)
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  // Map the users array to only what you want to send to the frontend
  const users = data.users.map(u => ({
    id: u.id,
    phone: u.phone
  }));
  res.status(200).json({ users });
}