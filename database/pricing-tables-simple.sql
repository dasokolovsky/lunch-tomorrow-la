-- Simplified Pricing System Database Setup
-- Run these commands in Supabase SQL Editor

-- 1. Create pricing_fees table
CREATE TABLE IF NOT EXISTS pricing_fees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
  amount DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  min_order_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create tip_settings table
CREATE TABLE IF NOT EXISTS tip_settings (
  id SERIAL PRIMARY KEY,
  preset_percentages INTEGER[] DEFAULT '{18,20,25}',
  default_percentage INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  allow_custom BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create tax_settings table
CREATE TABLE IF NOT EXISTS tax_settings (
  id SERIAL PRIMARY KEY,
  default_rate DECIMAL(5,2) DEFAULT 8.5,
  is_enabled BOOLEAN DEFAULT false,
  zone_specific_rates JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create coupon_codes table
CREATE TABLE IF NOT EXISTS coupon_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
  amount DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  min_order_amount DECIMAL(10,2),
  max_discount_amount DECIMAL(10,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create pricing_history table for tracking changes
CREATE TABLE IF NOT EXISTS pricing_history (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Insert default tip settings
INSERT INTO tip_settings (preset_percentages, default_percentage, is_enabled, allow_custom)
SELECT '{18,20,25}', 0, true, true
WHERE NOT EXISTS (SELECT 1 FROM tip_settings LIMIT 1);

-- 7. Insert default tax settings
INSERT INTO tax_settings (default_rate, is_enabled, zone_specific_rates)
SELECT 8.5, false, '{}'
WHERE NOT EXISTS (SELECT 1 FROM tax_settings LIMIT 1);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pricing_fees_active ON pricing_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_fees_type ON pricing_fees(type);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_active ON coupon_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_code ON coupon_codes(code);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_valid ON coupon_codes(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_pricing_history_table_record ON pricing_history(table_name, record_id);

-- 9. Create trigger function for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create triggers for updated_at
CREATE TRIGGER update_pricing_fees_updated_at BEFORE UPDATE ON pricing_fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tip_settings_updated_at BEFORE UPDATE ON tip_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_settings_updated_at BEFORE UPDATE ON tax_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupon_codes_updated_at BEFORE UPDATE ON coupon_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
