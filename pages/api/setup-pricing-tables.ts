import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Note: Tables need to be created manually in Supabase dashboard first
    // This endpoint just inserts default settings

    // Insert default tip settings if none exist
    const { data: existingTipSettings } = await supabase
      .from('tip_settings')
      .select('id')
      .limit(1)
      .single();

    if (!existingTipSettings) {
      const { error: insertTipError } = await supabase
        .from('tip_settings')
        .insert([{
          preset_percentages: [18, 20, 25],
          default_percentage: 0,
          is_enabled: true,
          allow_custom: true
        }]);

      if (insertTipError) {
        console.error('Error inserting default tip settings:', insertTipError);
      }
    }

    // Insert default tax settings if none exist
    const { data: existingTaxSettings } = await supabase
      .from('tax_settings')
      .select('id')
      .limit(1)
      .single();

    if (!existingTaxSettings) {
      const { error: insertTaxError } = await supabase
        .from('tax_settings')
        .insert([{
          default_rate: 8.5,
          is_enabled: false,
          zone_specific_rates: {}
        }]);

      if (insertTaxError) {
        console.error('Error inserting default tax settings:', insertTaxError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Default pricing settings inserted successfully'
    });

  } catch (error) {
    console.error('Error setting up pricing tables:', error);
    res.status(500).json({
      error: 'Failed to setup pricing tables',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
