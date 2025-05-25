#!/usr/bin/env node

/**
 * Script to add phone column to profiles table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

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
