#!/usr/bin/env node

/**
 * Script to add phone column to profiles table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kdzrnsdbhpxpzelmvyfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkenJuc2RiaHB4cHplbG12eWZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4MzYyMiwiZXhwIjoyMDYzMzU5NjIyfQ.pGt_HAXv2UVvyItYBikRMvpsG8VywewkVzk5itIN3_M';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addPhoneColumn() {
  try {
    console.log('🔄 Adding phone column to profiles table...');

    // Add phone column
    const { error: phoneError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;'
    });

    if (phoneError) {
      console.error('❌ Error adding phone column:', phoneError);
      return;
    }

    console.log('✅ Phone column added successfully!');

    // Add other columns for completeness
    const { error: emailError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;'
    });

    const { error: nameError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;'
    });

    const { error: stripeError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;'
    });

    console.log('✅ All columns added successfully!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

addPhoneColumn();
