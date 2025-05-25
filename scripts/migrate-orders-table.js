#!/usr/bin/env node

/**
 * Script to add delivery_notes and other missing columns to orders table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdzrnsdbhpxpzelmvyfm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkenJuc2RiaHB4cHplbG12eWZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4MzYyMiwiZXhwIjoyMDYzMzU5NjIyfQ.pGt_HAXv2UVvyItYBikRMvpsG8VywewkVzk5itIN3_M';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateOrdersTable() {
  try {
    console.log('🔄 Starting orders table migration...');

    // First, let's check the current structure of the orders table
    console.log('📋 Checking current orders table structure...');
    
    const { data: orders, error: selectError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('❌ Error checking orders table:', selectError.message);
      return;
    }

    if (orders && orders.length > 0) {
      console.log('✅ Current orders table columns:', Object.keys(orders[0]));
    } else {
      console.log('📝 Orders table exists but is empty');
    }

    // Since we can't execute DDL directly through Supabase client,
    // let's try using the REST API with RPC functions
    console.log('🔧 Attempting to add missing columns...');

    // Try to insert a test record with the new fields to see what's missing
    const testOrder = {
      user_id: 'test-user-id',
      menu_items: [{ name: 'Test Item', quantity: 1, price_cents: 1000 }],
      order_date: '2024-01-01',
      delivery_window: '12:00-12:30',
      address: 'Test Address',
      status: 'pending',
      stripe_payment_id: 'test_payment_id',
      delivery_notes: 'Test delivery notes',
      delivery_fee: 2.50,
      service_fee: 1.00,
      tax_amount: 0.75,
      total_amount: 14.25
    };

    console.log('🧪 Testing insert with new columns...');
    const { data: insertData, error: insertError } = await supabase
      .from('orders')
      .insert([testOrder])
      .select();

    if (insertError) {
      console.log('❌ Insert failed (expected if columns don\'t exist):', insertError.message);
      
      // Check which columns are missing
      if (insertError.message.includes('delivery_notes')) {
        console.log('❌ delivery_notes column is missing');
      }
      if (insertError.message.includes('delivery_fee')) {
        console.log('❌ delivery_fee column is missing');
      }
      if (insertError.message.includes('service_fee')) {
        console.log('❌ service_fee column is missing');
      }
      if (insertError.message.includes('tax_amount')) {
        console.log('❌ tax_amount column is missing');
      }
      if (insertError.message.includes('total_amount')) {
        console.log('❌ total_amount column is missing');
      }
      if (insertError.message.includes('updated_at')) {
        console.log('❌ updated_at column is missing');
      }

      console.log('\n📋 MANUAL MIGRATION REQUIRED:');
      console.log('Please run the following SQL commands in your Supabase SQL Editor:\n');
      
      console.log('-- Add missing columns to orders table');
      console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;');
      console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2);');
      console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2);');
      console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2);');
      console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);');
      console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
      console.log('\n-- Create trigger for updated_at');
      console.log('CREATE OR REPLACE FUNCTION update_orders_updated_at()');
      console.log('RETURNS TRIGGER AS $$');
      console.log('BEGIN');
      console.log('  NEW.updated_at = NOW();');
      console.log('  RETURN NEW;');
      console.log('END;');
      console.log('$$ language \'plpgsql\';');
      console.log('\nDROP TRIGGER IF EXISTS update_orders_updated_at_trigger ON orders;');
      console.log('CREATE TRIGGER update_orders_updated_at_trigger');
      console.log('  BEFORE UPDATE ON orders');
      console.log('  FOR EACH ROW');
      console.log('  EXECUTE FUNCTION update_orders_updated_at();');

    } else {
      console.log('✅ Test insert successful! All columns exist.');
      console.log('📝 Inserted test order:', insertData[0]);
      
      // Clean up test record
      if (insertData && insertData[0]) {
        await supabase
          .from('orders')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Cleaned up test record');
      }
    }

    console.log('\n✅ Migration check completed!');

  } catch (err) {
    console.error('❌ Migration error:', err.message);
  }
}

migrateOrdersTable();
