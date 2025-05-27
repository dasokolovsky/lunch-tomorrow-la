-- Fix Supabase RLS Security Issues
-- This migration enables RLS and creates appropriate policies for all tables

-- Enable RLS on all tables that need it
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_blasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;

-- Also enable RLS on delivery_zone if it exists (seems to be a duplicate/old table)
ALTER TABLE public.delivery_zone ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow anon select" ON public.menu_items;
DROP POLICY IF EXISTS "Allow anon select" ON public.menus;

-- MENU ITEMS - Public read access, admin write access
CREATE POLICY "Public read access for menu items" ON public.menu_items
    FOR SELECT USING (true);

CREATE POLICY "Admin write access for menu items" ON public.menu_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

-- MENUS - Public read access, admin write access
CREATE POLICY "Public read access for menus" ON public.menus
    FOR SELECT USING (true);

CREATE POLICY "Admin write access for menus" ON public.menus
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

-- ORDERS - Users can only see their own orders, admins can see all
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (
        auth.uid() = user_id::uuid
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

CREATE POLICY "Users can insert own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can update own orders or admins can update any" ON public.orders
    FOR UPDATE USING (
        auth.uid() = user_id::uuid
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

-- PRICING FEES - Public read access, admin write access
CREATE POLICY "Public read access for pricing fees" ON public.pricing_fees
    FOR SELECT USING (true);

CREATE POLICY "Admin write access for pricing fees" ON public.pricing_fees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

-- TIP SETTINGS - Public read access, admin write access
CREATE POLICY "Public read access for tip settings" ON public.tip_settings
    FOR SELECT USING (true);

CREATE POLICY "Admin write access for tip settings" ON public.tip_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

-- TAX SETTINGS - Public read access, admin write access
CREATE POLICY "Public read access for tax settings" ON public.tax_settings
    FOR SELECT USING (true);

CREATE POLICY "Admin write access for tax settings" ON public.tax_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

-- COUPON CODES - Public read access for validation, admin write access
CREATE POLICY "Public read access for coupon validation" ON public.coupon_codes
    FOR SELECT USING (true);

CREATE POLICY "Admin write access for coupon codes" ON public.coupon_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

-- DELIVERY ZONES - Public read access, admin write access
CREATE POLICY "Public read access for delivery zones" ON public.delivery_zones
    FOR SELECT USING (true);

CREATE POLICY "Admin write access for delivery zones" ON public.delivery_zones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

-- SMS BLASTS - Admin only access
CREATE POLICY "Admin only access for sms blasts" ON public.sms_blasts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

-- PRICING HISTORY - Admin only access
CREATE POLICY "Admin only access for pricing history" ON public.pricing_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN (
                'daniel@sokolovsky.com',
                'd@sokolovsky.com'
            )
        )
    );

-- DELIVERY_ZONE (old table) - Public read access if it exists
CREATE POLICY "Public read access for delivery zone" ON public.delivery_zone
    FOR SELECT USING (true);

-- Grant necessary permissions to authenticated and anonymous users
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT SELECT ON public.menus TO anon, authenticated;
GRANT SELECT ON public.pricing_fees TO anon, authenticated;
GRANT SELECT ON public.tip_settings TO anon, authenticated;
GRANT SELECT ON public.tax_settings TO anon, authenticated;
GRANT SELECT ON public.coupon_codes TO anon, authenticated;
GRANT SELECT ON public.delivery_zones TO anon, authenticated;
GRANT SELECT ON public.delivery_zone TO anon, authenticated;

-- Orders - authenticated users can manage their own orders
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- Admin tables - no public access (handled by policies)
GRANT ALL ON public.sms_blasts TO authenticated;
GRANT ALL ON public.pricing_history TO authenticated;

-- Verify RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasoids
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'menu_items', 'menus', 'orders', 'pricing_fees',
        'tip_settings', 'tax_settings', 'coupon_codes',
        'delivery_zones', 'delivery_zone', 'sms_blasts',
        'pricing_history'
    )
ORDER BY tablename;

-- List all policies to verify they were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
