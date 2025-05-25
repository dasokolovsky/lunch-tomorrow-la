import { NextApiRequest, NextApiResponse } from "next";
import { calculateMenuDay } from "@/utils/menuDayCalculator";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get current time in Pacific timezone
    const now = new Date();
    const pacificTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    
    // Calculate menu day info
    const menuDayInfo = await calculateMenuDay();
    
    // Get current settings
    const settingsResponse = await fetch(`${req.headers.origin}/api/settings`);
    const settings = settingsResponse.ok ? await settingsResponse.json() : {};
    
    res.status(200).json({
      currentTime: {
        utc: now.toISOString(),
        pacific: pacificTime.toISOString(),
        pacificString: pacificTime.toLocaleString("en-US", { 
          timeZone: "America/Los_Angeles",
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      },
      menuDayInfo,
      settings: settings.order_cutoff_time || 'Not found',
      debug: {
        hasMenuItems: menuDayInfo?.hasMenuItems,
        isExpired: menuDayInfo?.isExpired,
        nextCutoffTime: menuDayInfo?.nextCutoffTime,
        menuDate: menuDayInfo?.menuDate,
        displayDate: menuDayInfo?.displayDate
      }
    });

  } catch (error) {
    console.error('Error testing cutoff logic:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
