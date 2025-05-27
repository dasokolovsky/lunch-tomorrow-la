import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: "Date parameter is required" });
    }

    // Parse the date to get day of week
    const deliveryDate = new Date(date);
    const dayOfWeek = deliveryDate.toLocaleDateString('en-US', { weekday: 'lowercase' });

    // Get delivery zones and their windows
    const { data: zones, error: zonesError } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('active', true);

    if (zonesError) {
      console.error("Error fetching delivery zones:", zonesError);
      return res.status(500).json({ error: "Failed to fetch delivery zones" });
    }

    // Collect all available windows for the day
    const availableWindows = new Set<string>();

    zones?.forEach(zone => {
      if (zone.windows && zone.windows[dayOfWeek]) {
        zone.windows[dayOfWeek].forEach((window: { start: string; end: string }) => {
          availableWindows.add(`${window.start}-${window.end}`);
        });
      }
    });

    // Convert to array and sort
    const windowsArray = Array.from(availableWindows)
      .map(window => {
        const [start, end] = window.split('-');
        return { start, end };
      })
      .sort((a, b) => {
        // Sort by start time
        const timeA = a.start.split(':').map(Number);
        const timeB = b.start.split(':').map(Number);
        return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
      });

    res.status(200).json({ windows: windowsArray });

  } catch (error) {
    console.error("Delivery windows API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
