#!/usr/bin/env node

/**
 * Script to remove min_order_amount column from zone_tax_settings table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeTaxMinOrder() {
  try {
    console.log('🔧 Removing min_order_amount column from zone_tax_settings table...');

    // Since we can't execute DDL directly through Supabase client,
    // we'll provide the SQL commands to run manually
    console.log('');
    console.log('📋 Please run the following SQL commands in your Supabase SQL Editor:');
    console.log('');
    console.log('-- Remove min_order_amount column from zone_tax_settings table');
    console.log('ALTER TABLE zone_tax_settings DROP COLUMN IF EXISTS min_order_amount;');
    console.log('');
    console.log('-- Add comment to document the change');
    console.log("COMMENT ON TABLE zone_tax_settings IS 'Zone-specific tax settings without minimum order requirements';");
    console.log('');
    console.log('-- Verify the migration by checking table structure');
    console.log('SELECT column_name, data_type, is_nullable, column_default');
    console.log('FROM information_schema.columns');
    console.log("WHERE table_name = 'zone_tax_settings' AND table_schema = 'public'");
    console.log('ORDER BY ordinal_position;');
    console.log('');
    console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0]);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

removeTaxMinOrder();
