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
      const { subtotal, delivery_zone_id } = req.body;

      if (!subtotal || subtotal <= 0) {
        return res.status(400).json({ error: "Invalid subtotal" });
      }

      let totalFees = 0;
      const feeBreakdown: Array<{name: string, amount: number, type: string}> = [];
      let taxAmount = 0;
      let taxRate = 0;

      // Try to get zone-specific pricing first
      if (delivery_zone_id) {
        // Get zone-specific fees
        const { data: zoneFees } = await supabase
          .from('zone_pricing_fees')
          .select('*')
          .eq('delivery_zone_id', delivery_zone_id)
          .eq('is_active', true);

        // Get zone-specific tax settings
        const { data: zoneTaxSettings } = await supabase
          .from('zone_tax_settings')
          .select('*')
          .eq('delivery_zone_id', delivery_zone_id)
          .eq('is_enabled', true)
          .single();

        // Calculate zone-specific fees
        if (zoneFees && zoneFees.length > 0) {
          for (const fee of zoneFees) {
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
        } else {
          // Fallback to global fees if no zone-specific fees
          const { data: globalFees } = await supabase
            .from('pricing_fees')
            .select('*')
            .eq('is_active', true);

          if (globalFees) {
            for (const fee of globalFees) {
              if (fee.min_order_amount && subtotal < fee.min_order_amount) {
                continue;
              }

              let feeAmount = 0;
              if (fee.type === 'percentage') {
                feeAmount = subtotal * (fee.amount / 100);
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
        }

        // Calculate zone-specific tax
        if (zoneTaxSettings) {
          taxRate = zoneTaxSettings.tax_rate;
          taxAmount = (subtotal + totalFees) * (taxRate / 100);
        } else {
          // Fallback to global tax settings
          const { data: globalTaxSettings } = await supabase
            .from('tax_settings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (globalTaxSettings?.is_enabled) {
            taxRate = globalTaxSettings.default_rate;
            taxAmount = (subtotal + totalFees) * (taxRate / 100);
          }
        }
      } else {
        // No zone specified, use global pricing
        const { data: globalFees } = await supabase
          .from('pricing_fees')
          .select('*')
          .eq('is_active', true);

        const { data: globalTaxSettings } = await supabase
          .from('tax_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Calculate global fees
        if (globalFees) {
          for (const fee of globalFees) {
            if (fee.min_order_amount && subtotal < fee.min_order_amount) {
              continue;
            }

            let feeAmount = 0;
            if (fee.type === 'percentage') {
              feeAmount = subtotal * (fee.amount / 100);
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

        // Calculate global tax
        if (globalTaxSettings?.is_enabled) {
          taxRate = globalTaxSettings.default_rate;
          taxAmount = (subtotal + totalFees) * (taxRate / 100);
        }
      }

      const total = subtotal + totalFees + taxAmount;

      res.status(200).json({
        subtotal,
        fees: feeBreakdown,
        totalFees,
        taxAmount,
        taxRate,
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
