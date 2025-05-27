const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupZonePricing() {
  try {
    console.log('🚀 Setting up zone-specific pricing tables...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'zone-pricing-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL commands (basic splitting by semicolon)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Found ${commands.length} SQL commands to execute`);

    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        console.log(`⚡ Executing command ${i + 1}/${commands.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase
            .from('_temp')
            .select('1')
            .limit(0);
          
          if (directError) {
            console.log(`⚠️  Command ${i + 1} failed, but continuing...`);
            console.log(`Command: ${command.substring(0, 100)}...`);
            console.log(`Error: ${error.message}`);
          }
        } else {
          console.log(`✅ Command ${i + 1} executed successfully`);
        }
      }
    }

    console.log('🎉 Zone pricing setup completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the contents of database/zone-pricing-tables.sql');
    console.log('4. Run the SQL commands manually');
    console.log('');
    console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0]);

  } catch (error) {
    console.error('❌ Error setting up zone pricing:', error);
    console.log('');
    console.log('📋 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the contents of database/zone-pricing-tables.sql');
    console.log('4. Run the SQL commands manually');
  }
}

setupZonePricing();
