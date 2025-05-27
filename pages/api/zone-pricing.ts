import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      // Get all zone pricing data
      const { data: zones } = await supabase
        .from('delivery_zones')
        .select('id, name, active')
        .order('name');

      const { data: zoneFees } = await supabase
        .from('zone_pricing_fees')
        .select('*')
        .order('delivery_zone_id, name');

      const { data: zoneTaxSettings } = await supabase
        .from('zone_tax_settings')
        .select('*')
        .order('delivery_zone_id');

      // Organize data by zone
      const zonePricing = (zones || []).map(zone => ({
        zone,
        fees: (zoneFees || []).filter(fee => fee.delivery_zone_id === zone.id),
        taxSettings: (zoneTaxSettings || []).find(tax => tax.delivery_zone_id === zone.id) || {
          delivery_zone_id: zone.id,
          tax_rate: 8.50,
          is_enabled: true
        }
      }));

      res.status(200).json(zonePricing);

    } else if (req.method === "POST") {
      // Update zone pricing
      const { zoneId, fees, taxSettings } = req.body;

      if (!zoneId) {
        return res.status(400).json({ error: "Zone ID is required" });
      }

      // Update or create tax settings
      if (taxSettings) {
        const { data: existingTax } = await supabase
          .from('zone_tax_settings')
          .select('id')
          .eq('delivery_zone_id', zoneId)
          .single();

        if (existingTax) {
          await supabase
            .from('zone_tax_settings')
            .update({
              tax_rate: taxSettings.tax_rate,
              is_enabled: taxSettings.is_enabled,
              description: taxSettings.description,
              updated_at: new Date().toISOString()
            })
            .eq('delivery_zone_id', zoneId);
        } else {
          await supabase
            .from('zone_tax_settings')
            .insert({
              delivery_zone_id: zoneId,
              tax_rate: taxSettings.tax_rate,
              is_enabled: taxSettings.is_enabled,
              description: taxSettings.description
            });
        }
      }

      // Update fees - delete existing and insert new ones
      if (fees && Array.isArray(fees)) {
        // Delete existing fees for this zone
        await supabase
          .from('zone_pricing_fees')
          .delete()
          .eq('delivery_zone_id', zoneId);

        // Insert new fees
        if (fees.length > 0) {
          const feesToInsert = fees.map(fee => ({
            delivery_zone_id: zoneId,
            name: fee.name,
            type: fee.type,
            amount: fee.amount,
            is_active: fee.is_active,
            min_order_amount: fee.min_order_amount,
            max_amount: fee.max_amount,
            description: fee.description
          }));

          await supabase
            .from('zone_pricing_fees')
            .insert(feesToInsert);
        }
      }

      res.status(200).json({ success: true });

    } else if (req.method === "DELETE") {
      // Delete zone pricing (when zone is deleted)
      const { zoneId } = req.query;

      if (!zoneId) {
        return res.status(400).json({ error: "Zone ID is required" });
      }

      // Delete zone fees and tax settings (should cascade automatically)
      await supabase
        .from('zone_pricing_fees')
        .delete()
        .eq('delivery_zone_id', zoneId);

      await supabase
        .from('zone_tax_settings')
        .delete()
        .eq('delivery_zone_id', zoneId);

      res.status(200).json({ success: true });

    } else {
      res.status(405).json({ error: "Method not allowed" });
    }

  } catch (error) {
    console.error("Zone pricing API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
