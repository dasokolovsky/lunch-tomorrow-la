-- Create settings table for order cutoff times and other global settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_settings_updated_at_trigger ON settings;
CREATE TRIGGER update_settings_updated_at_trigger
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Insert default order cutoff times (6:00 PM for all days)
INSERT INTO settings (setting_key, setting_value) 
VALUES (
  'order_cutoff_times',
  '{
    "monday": "18:00",
    "tuesday": "18:00", 
    "wednesday": "18:00",
    "thursday": "18:00",
    "friday": "18:00",
    "saturday": "18:00",
    "sunday": "18:00"
  }'::jsonb
) ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS on settings table
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for settings table (admin only)
DROP POLICY IF EXISTS "Admin can view settings" ON settings;
CREATE POLICY "Admin can view settings" ON settings
  FOR SELECT USING (true); -- For now, allow all reads (we'll add admin auth later)

DROP POLICY IF EXISTS "Admin can update settings" ON settings;
CREATE POLICY "Admin can update settings" ON settings
  FOR UPDATE USING (true); -- For now, allow all updates (we'll add admin auth later)

DROP POLICY IF EXISTS "Admin can insert settings" ON settings;
CREATE POLICY "Admin can insert settings" ON settings
  FOR INSERT WITH CHECK (true); -- For now, allow all inserts (we'll add admin auth later)
