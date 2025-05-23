import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("delivery_zones")
      .select("*")
      .order("name", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Ensure all ids are strings, and windows is always an object
    const safeData = (data ?? []).map((z) => ({
      ...z,
      id: String(z.id),
      windows: z.windows ?? {},
    }));

    res.json(safeData);
  } else if (req.method === "POST") {
    const { name, geojson, windows, active } = req.body;
    if (!name || !geojson || !windows) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const { data, error } = await supabaseAdmin
      .from("delivery_zones")
      .insert([{ name, geojson, windows: windows ?? {}, active }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    // Ensure returned id is a string, and windows is always an object
    const safeZone = {
      ...data,
      id: String(data.id),
      windows: data.windows ?? {},
    };

    res.status(201).json(safeZone);
  } else {
    res.setHeader("Allow", "GET, POST");
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}