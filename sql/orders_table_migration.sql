-- =====================================================
-- Orders Table Migration - Add Delivery Notes & Fees
-- =====================================================
-- This migration adds missing columns to support:
-- - Customer delivery instructions/notes
-- - Fee breakdown (delivery, service, tax)
-- - Order totals and timestamps
-- =====================================================

-- Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at (if it doesn't exist)
DROP TRIGGER IF EXISTS update_orders_updated_at_trigger ON orders;
CREATE TRIGGER update_orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Add comments to document the new columns
COMMENT ON COLUMN orders.delivery_notes IS 'Customer delivery instructions (e.g., "Leave at front door")';
COMMENT ON COLUMN orders.delivery_fee IS 'Delivery fee in dollars';
COMMENT ON COLUMN orders.service_fee IS 'Service fee in dollars';
COMMENT ON COLUMN orders.tax_amount IS 'Tax amount in dollars';
COMMENT ON COLUMN orders.total_amount IS 'Total order amount including all fees and taxes';
COMMENT ON COLUMN orders.updated_at IS 'Timestamp when order was last updated';

-- Verify the migration by checking table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
