import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid id" });

  if (req.method === "PUT") {
    const { name, geojson, windows, active } = req.body;
    const { data, error } = await supabaseAdmin
      .from("delivery_zones")
      .update({ name, geojson, windows, active })
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } else if (req.method === "DELETE") {
    const { error } = await supabaseAdmin
      .from("delivery_zones")
      .delete()
      .eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).end();
  } else {
    res.setHeader("Allow", "PUT, DELETE");
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}