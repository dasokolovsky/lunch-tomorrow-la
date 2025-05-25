import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export interface OrderCutoffTimes {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface SettingsResponse {
  order_cutoff_times: OrderCutoffTimes;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      // Get all settings
      const { data, error } = await supabaseAdmin
        .from("settings")
        .select("setting_key, setting_value");

      if (error) {
        console.error("Error fetching settings:", error);
        return res.status(500).json({ error: error.message });
      }

      // Transform array of settings into object
      const settings: any = {};
      if (data) {
        data.forEach((setting) => {
          settings[setting.setting_key] = setting.setting_value;
        });
      }

      // Ensure order_cutoff_times exists with defaults
      if (!settings.order_cutoff_times) {
        settings.order_cutoff_times = {
          monday: "18:00",
          tuesday: "18:00",
          wednesday: "18:00",
          thursday: "18:00",
          friday: "18:00",
          saturday: "18:00",
          sunday: "18:00"
        };
      }

      res.json(settings);

    } else if (req.method === "PUT") {
      // Update settings
      const { setting_key, setting_value } = req.body;

      if (!setting_key || setting_value === undefined) {
        return res.status(400).json({ error: "setting_key and setting_value are required" });
      }

      // Validate order_cutoff_times if that's what we're updating
      if (setting_key === "order_cutoff_times") {
        const cutoffTimes = setting_value as OrderCutoffTimes;
        const requiredDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        
        for (const day of requiredDays) {
          if (!cutoffTimes[day as keyof OrderCutoffTimes]) {
            return res.status(400).json({ error: `Missing cutoff time for ${day}` });
          }
          
          // Validate time format (HH:MM)
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(cutoffTimes[day as keyof OrderCutoffTimes])) {
            return res.status(400).json({ error: `Invalid time format for ${day}. Use HH:MM format.` });
          }
        }
      }

      // Upsert the setting
      const { data, error } = await supabaseAdmin
        .from("settings")
        .upsert(
          { setting_key, setting_value },
          { onConflict: "setting_key" }
        )
        .select()
        .single();

      if (error) {
        console.error("Error updating setting:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json(data);

    } else {
      res.setHeader("Allow", "GET, PUT");
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("Settings API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
