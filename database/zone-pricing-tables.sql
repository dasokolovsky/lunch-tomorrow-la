-- Zone-Specific Pricing Database Setup
-- Run these commands in Supabase SQL Editor

-- 1. Create zone_pricing_fees table for zone-specific delivery fees
CREATE TABLE IF NOT EXISTS zone_pricing_fees (
  id SERIAL PRIMARY KEY,
  delivery_zone_id UUID NOT NULL REFERENCES delivery_zones(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
  amount DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  min_order_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(delivery_zone_id, name)
);

-- 2. Create zone_tax_settings table for zone-specific tax rates
CREATE TABLE IF NOT EXISTS zone_tax_settings (
  id SERIAL PRIMARY KEY,
  delivery_zone_id UUID NOT NULL REFERENCES delivery_zones(id) ON DELETE CASCADE,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  is_enabled BOOLEAN DEFAULT true,
  min_order_amount DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(delivery_zone_id)
);

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zone_pricing_fees_zone_id ON zone_pricing_fees(delivery_zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_pricing_fees_active ON zone_pricing_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_zone_tax_settings_zone_id ON zone_tax_settings(delivery_zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_tax_settings_enabled ON zone_tax_settings(is_enabled);

-- 4. Create function to automatically create default zone pricing when a new zone is created
CREATE OR REPLACE FUNCTION create_default_zone_pricing()
RETURNS TRIGGER AS $$
DECLARE
  default_delivery_fee DECIMAL(10,2) := 3.00;
  default_tax_rate DECIMAL(5,2) := 8.50;
BEGIN
  -- Create default delivery fee for new zone
  INSERT INTO zone_pricing_fees (
    delivery_zone_id,
    name,
    type,
    amount,
    is_active,
    description
  ) VALUES (
    NEW.id,
    'Delivery Fee',
    'fixed',
    default_delivery_fee,
    true,
    'Default delivery fee for ' || NEW.name
  );

  -- Create default tax settings for new zone
  INSERT INTO zone_tax_settings (
    delivery_zone_id,
    tax_rate,
    is_enabled,
    description
  ) VALUES (
    NEW.id,
    default_tax_rate,
    true,
    'Default tax rate for ' || NEW.name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically create default pricing for new zones
DROP TRIGGER IF EXISTS trigger_create_default_zone_pricing ON delivery_zones;
CREATE TRIGGER trigger_create_default_zone_pricing
  AFTER INSERT ON delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION create_default_zone_pricing();

-- 6. Add RLS policies for zone pricing tables
ALTER TABLE zone_pricing_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_tax_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (admin access)
CREATE POLICY "Allow all operations for authenticated users" ON zone_pricing_fees
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON zone_tax_settings
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow read access for anonymous users (for pricing calculations)
CREATE POLICY "Allow read access for anonymous users" ON zone_pricing_fees
  FOR SELECT USING (true);

CREATE POLICY "Allow read access for anonymous users" ON zone_tax_settings
  FOR SELECT USING (true);
