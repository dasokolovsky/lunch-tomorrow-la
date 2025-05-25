import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";

export interface UserAddress {
  id: string;
  user_id: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lon: number;
  display_name: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the user's session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (req.method === "GET") {
      // Get user's saved addresses (limit to 5 most recent)
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching user addresses:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json(data || []);
    } else if (req.method === "POST") {
      // Save a new address
      const {
        address_line_1,
        address_line_2,
        city,
        state,
        zip,
        lat,
        lon,
        display_name,
        is_primary = false
      } = req.body;

      if (!address_line_1 || !city || !state || !zip || !lat || !lon || !display_name) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // If this is being set as primary, unset other primary addresses
      if (is_primary) {
        await supabase
          .from("user_addresses")
          .update({ is_primary: false })
          .eq("user_id", user.id);
      }

      // Check if we already have 5 addresses, remove the oldest if so
      const { data: existingAddresses } = await supabase
        .from("user_addresses")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (existingAddresses && existingAddresses.length >= 5) {
        // Remove the oldest address(es)
        const addressesToRemove = existingAddresses.slice(4); // Keep only the 4 most recent
        const idsToRemove = addressesToRemove.map(addr => addr.id);
        
        await supabase
          .from("user_addresses")
          .delete()
          .in("id", idsToRemove);
      }

      // Insert the new address
      const { data, error } = await supabase
        .from("user_addresses")
        .insert([{
          user_id: user.id,
          address_line_1,
          address_line_2,
          city,
          state,
          zip,
          lat,
          lon,
          display_name,
          is_primary
        }])
        .select()
        .single();

      if (error) {
        console.error("Error saving user address:", error);
        return res.status(500).json({ error: error.message });
      }

      res.status(201).json(data);
    } else if (req.method === "DELETE") {
      // Delete an address
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: "Address ID required" });
      }

      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Ensure user can only delete their own addresses

      if (error) {
        console.error("Error deleting user address:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true });
    } else {
      res.setHeader("Allow", "GET, POST, DELETE");
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
