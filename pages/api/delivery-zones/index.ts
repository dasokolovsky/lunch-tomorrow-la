import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("delivery_zones")
        .select("*")
        .order("name", { ascending: true });
      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json(data || []);
    } else if (req.method === "POST") {
      const { name, geojson, windows, active } = req.body;
      if (!name || !geojson || !windows) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const { data, error } = await supabaseAdmin
        .from("delivery_zones")
        .insert([{ name, geojson, windows, active }])
        .select()
        .single();
      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }
      res.status(201).json(data);
    } else {
      res.setHeader("Allow", "GET, POST");
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}