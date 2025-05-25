import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      // Get all pricing settings
      const [feesResult, tipResult, taxResult] = await Promise.all([
        supabase
          .from('pricing_fees')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('tip_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        
        supabase
          .from('tax_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      ]);

      const response = {
        fees: feesResult.data || [],
        tipSettings: tipResult.data || {
          preset_percentages: [18, 20, 25],
          default_percentage: 0,
          is_enabled: true,
          allow_custom: true
        },
        taxSettings: taxResult.data || {
          default_rate: 8.5,
          is_enabled: false,
          zone_specific_rates: {}
        }
      };

      res.status(200).json(response);

    } else if (req.method === "POST") {
      // Calculate pricing for an order
      const { subtotal, delivery_zone_id, user_location } = req.body;

      if (!subtotal || subtotal <= 0) {
        return res.status(400).json({ error: "Invalid subtotal" });
      }

      // Get active fees
      const { data: fees } = await supabase
        .from('pricing_fees')
        .select('*')
        .eq('is_active', true);

      // Get tax settings
      const { data: taxSettings } = await supabase
        .from('tax_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let totalFees = 0;
      let feeBreakdown: Array<{name: string, amount: number, type: string}> = [];
      let taxAmount = 0;

      // Calculate fees
      if (fees) {
        for (const fee of fees) {
          // Check minimum order amount
          if (fee.min_order_amount && subtotal < fee.min_order_amount) {
            continue;
          }

          let feeAmount = 0;
          if (fee.type === 'percentage') {
            feeAmount = subtotal * (fee.amount / 100);
            // Apply max amount if specified
            if (fee.max_amount && feeAmount > fee.max_amount) {
              feeAmount = fee.max_amount;
            }
          } else {
            feeAmount = fee.amount;
          }

          totalFees += feeAmount;
          feeBreakdown.push({
            name: fee.name,
            amount: feeAmount,
            type: fee.type
          });
        }
      }

      // Calculate tax
      if (taxSettings?.is_enabled) {
        let taxRate = taxSettings.default_rate;
        
        // Check for zone-specific tax rate
        if (delivery_zone_id && taxSettings.zone_specific_rates) {
          const zoneRate = taxSettings.zone_specific_rates[delivery_zone_id];
          if (zoneRate !== undefined) {
            taxRate = zoneRate;
          }
        }

        // Tax is calculated on subtotal + fees
        taxAmount = (subtotal + totalFees) * (taxRate / 100);
      }

      const total = subtotal + totalFees + taxAmount;

      res.status(200).json({
        subtotal,
        fees: feeBreakdown,
        totalFees,
        taxAmount,
        taxRate: taxSettings?.is_enabled ? 
          (delivery_zone_id && taxSettings.zone_specific_rates[delivery_zone_id]) || taxSettings.default_rate 
          : 0,
        total
      });

    } else {
      res.status(405).json({ error: "Method not allowed" });
    }

  } catch (error) {
    console.error('Error in pricing-settings API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
