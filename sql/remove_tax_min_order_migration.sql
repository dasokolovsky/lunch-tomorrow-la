-- Migration to remove min_order_amount from zone_tax_settings table
-- This removes the minimum order requirement for tax calculation

-- Remove the min_order_amount column from zone_tax_settings table
ALTER TABLE zone_tax_settings DROP COLUMN IF EXISTS min_order_amount;

-- Add comment to document the change
COMMENT ON TABLE zone_tax_settings IS 'Zone-specific tax settings without minimum order requirements';

-- Verify the migration by checking table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'zone_tax_settings' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
