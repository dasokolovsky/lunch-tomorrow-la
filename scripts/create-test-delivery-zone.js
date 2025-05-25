// Script to create a test delivery zone for LA area
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simple polygon covering central LA area (including Koreatown/Ardmore area)
const testZoneGeojson = {
  "type": "Feature",
  "properties": {
    "name": "Central LA Test Zone"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-118.4, 34.0],    // Southwest corner
      [-118.2, 34.0],    // Southeast corner  
      [-118.2, 34.15],   // Northeast corner
      [-118.4, 34.15],   // Northwest corner
      [-118.4, 34.0]     // Close the polygon
    ]]
  }
};

// Test delivery windows
const testWindows = {
  "monday": [
    { "start": "11:00", "end": "13:00" },
    { "start": "13:00", "end": "15:00" }
  ],
  "tuesday": [
    { "start": "11:00", "end": "13:00" },
    { "start": "13:00", "end": "15:00" }
  ],
  "wednesday": [
    { "start": "11:00", "end": "13:00" },
    { "start": "13:00", "end": "15:00" }
  ],
  "thursday": [
    { "start": "11:00", "end": "13:00" },
    { "start": "13:00", "end": "15:00" }
  ],
  "friday": [
    { "start": "11:00", "end": "13:00" },
    { "start": "13:00", "end": "15:00" }
  ]
};

async function createTestZone() {
  try {
    console.log('Creating test delivery zone...');
    
    const { data, error } = await supabase
      .from('delivery_zones')
      .insert([{
        name: 'Central LA Test Zone',
        geojson: testZoneGeojson,
        windows: testWindows,
        active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating delivery zone:', error);
      return;
    }

    console.log('✅ Test delivery zone created successfully!');
    console.log('Zone ID:', data.id);
    console.log('Zone covers coordinates around 34.067, -118.301 (Ardmore area)');
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

createTestZone();
