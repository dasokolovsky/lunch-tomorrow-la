import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const results: {
      tables: Record<string, any>;
      errors: string[];
      success: boolean;
      api_test?: any;
    } = {
      tables: {},
      errors: [],
      success: true
    };

    // Test pricing_fees table
    try {
      const { data: fees, error: feesError } = await supabase
        .from('pricing_fees')
        .select('*')
        .limit(5);

      if (feesError) throw feesError;
      results.tables.pricing_fees = {
        exists: true,
        count: fees?.length || 0,
        sample: fees?.[0] || null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`pricing_fees: ${errorMessage}`);
      results.tables.pricing_fees = { exists: false, error: errorMessage };
      results.success = false;
    }

    // Test tip_settings table
    try {
      const { data: tipSettings, error: tipError } = await supabase
        .from('tip_settings')
        .select('*')
        .limit(1)
        .single();

      if (tipError) throw tipError;
      results.tables.tip_settings = {
        exists: true,
        data: tipSettings
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`tip_settings: ${errorMessage}`);
      results.tables.tip_settings = { exists: false, error: errorMessage };
      results.success = false;
    }

    // Test tax_settings table
    try {
      const { data: taxSettings, error: taxError } = await supabase
        .from('tax_settings')
        .select('*')
        .limit(1)
        .single();

      if (taxError) throw taxError;
      results.tables.tax_settings = {
        exists: true,
        data: taxSettings
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`tax_settings: ${errorMessage}`);
      results.tables.tax_settings = { exists: false, error: errorMessage };
      results.success = false;
    }

    // Test coupon_codes table
    try {
      const { data: coupons, error: couponError } = await supabase
        .from('coupon_codes')
        .select('*')
        .limit(5);

      if (couponError) throw couponError;
      results.tables.coupon_codes = {
        exists: true,
        count: coupons?.length || 0,
        sample: coupons?.[0] || null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`coupon_codes: ${errorMessage}`);
      results.tables.coupon_codes = { exists: false, error: errorMessage };
      results.success = false;
    }

    // Test pricing_history table
    try {
      const { data: history, error: historyError } = await supabase
        .from('pricing_history')
        .select('*')
        .limit(5);

      if (historyError) throw historyError;
      results.tables.pricing_history = {
        exists: true,
        count: history?.length || 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`pricing_history: ${errorMessage}`);
      results.tables.pricing_history = { exists: false, error: errorMessage };
      results.success = false;
    }

    // Test pricing settings API
    try {
      const response = await fetch(`${req.headers.origin}/api/pricing-settings`);
      const apiData = await response.json();
      results.api_test = {
        success: response.ok,
        data: apiData
      };
    } catch (error) {
      results.api_test = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    res.status(200).json(results);

  } catch (error) {
    console.error('Error verifying pricing tables:', error);
    res.status(500).json({
      error: 'Failed to verify pricing tables',
      details: error instanceof Error ? error.message : String(error),
      success: false
    });
  }
}
