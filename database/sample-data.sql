-- Sample Data for Pricing System
-- Run this AFTER the main pricing-tables.sql setup is complete
-- This adds sample fees and coupon codes for testing

-- Insert sample pricing fees
INSERT INTO pricing_fees (name, type, amount, is_active, description) 
SELECT 'Delivery Fee', 'fixed', 2.99, true, 'Standard delivery fee'
WHERE NOT EXISTS (SELECT 1 FROM pricing_fees WHERE name = 'Delivery Fee');

INSERT INTO pricing_fees (name, type, amount, is_active, description) 
SELECT 'Service Fee', 'percentage', 3.5, true, 'Service and processing fee'
WHERE NOT EXISTS (SELECT 1 FROM pricing_fees WHERE name = 'Service Fee');

INSERT INTO pricing_fees (name, type, amount, is_active, description) 
SELECT 'Small Order Fee', 'fixed', 1.99, true, 'Fee for orders under $15'
WHERE NOT EXISTS (SELECT 1 FROM pricing_fees WHERE name = 'Small Order Fee');

-- Insert sample coupon codes
INSERT INTO coupon_codes (code, name, type, amount, is_active, min_order_amount, usage_limit, valid_from, valid_until, description) 
SELECT 'WELCOME10', 'Welcome Discount', 'percentage', 10, true, 20.00, 100, NOW(), NOW() + INTERVAL '30 days', '10% off for new customers'
WHERE NOT EXISTS (SELECT 1 FROM coupon_codes WHERE code = 'WELCOME10');

INSERT INTO coupon_codes (code, name, type, amount, is_active, min_order_amount, usage_limit, valid_from, valid_until, description) 
SELECT 'SAVE5', 'Save $5', 'fixed', 5.00, true, 25.00, 50, NOW(), NOW() + INTERVAL '7 days', '$5 off orders over $25'
WHERE NOT EXISTS (SELECT 1 FROM coupon_codes WHERE code = 'SAVE5');
