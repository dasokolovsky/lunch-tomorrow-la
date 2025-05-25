#!/usr/bin/env node

/**
 * Script to add delivery_notes column to orders table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdzrnsdbhpxpzelmvyfm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkenJuc2RiaHB4cHplbG12eWZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4MzYyMiwiZXhwIjoyMDYzMzU5NjIyfQ.pGt_HAXv2UVvyItYBikRMvpsG8VywewkVzk5itIN3_M';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addDeliveryNotesColumn() {
  try {
    console.log('🔄 Adding delivery_notes column to orders table...');

    // Try to add delivery_notes column
    console.log('Adding delivery_notes column...');
    const { error: notesError } = await supabase
      .from('orders')
      .select('delivery_notes')
      .limit(1);

    if (notesError && notesError.message.includes('column "delivery_notes" does not exist')) {
      console.log('delivery_notes column does not exist, need to add it via SQL');
      // Column doesn't exist, we need to add it
      // Since we can't execute DDL directly, let's check what we can do
      console.log('❌ Cannot add column via Supabase client. Please add manually in Supabase dashboard:');
      console.log('ALTER TABLE orders ADD COLUMN delivery_notes TEXT;');
    } else {
      console.log('✅ delivery_notes column already exists or accessible');
    }

    // Check other columns
    const { data: sampleOrder } = await supabase
      .from('orders')
      .select('*')
      .limit(1);

    if (sampleOrder && sampleOrder.length > 0) {
      const order = sampleOrder[0];
      console.log('Current order columns:', Object.keys(order));

      if (!order.hasOwnProperty('delivery_notes')) {
        console.log('❌ delivery_notes column missing');
      } else {
        console.log('✅ delivery_notes column exists');
      }
    }

    console.log('✅ Column check completed!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

addDeliveryNotesColumn();
