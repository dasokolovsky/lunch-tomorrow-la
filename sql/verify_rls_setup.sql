-- Verification script to check RLS setup
-- Run this after applying the RLS fixes to verify everything is working

-- 1. Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'menu_items', 'menus', 'orders', 'pricing_fees', 
        'tip_settings', 'tax_settings', 'coupon_codes', 
        'delivery_zones', 'delivery_zone', 'sms_blasts', 
        'pricing_history'
    )
ORDER BY tablename;

-- 2. List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN '👁️ Read'
        WHEN cmd = 'INSERT' THEN '➕ Insert'
        WHEN cmd = 'UPDATE' THEN '✏️ Update'
        WHEN cmd = 'DELETE' THEN '🗑️ Delete'
        WHEN cmd = 'ALL' THEN '🔧 All Operations'
        ELSE cmd
    END as operation_type
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename IN (
        'menu_items', 'menus', 'orders', 'pricing_fees', 
        'tip_settings', 'tax_settings', 'coupon_codes', 
        'delivery_zones', 'delivery_zone', 'sms_blasts', 
        'pricing_history'
    )
ORDER BY tablename, policyname;

-- 3. Check table permissions
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public'
    AND table_name IN (
        'menu_items', 'menus', 'orders', 'pricing_fees', 
        'tip_settings', 'tax_settings', 'coupon_codes', 
        'delivery_zones', 'delivery_zone', 'sms_blasts', 
        'pricing_history'
    )
    AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY table_name, grantee, privilege_type;

-- 4. Summary report
SELECT 
    'Security Status Summary' as report_section,
    COUNT(*) as total_tables,
    COUNT(CASE WHEN rowsecurity THEN 1 END) as tables_with_rls,
    COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as tables_without_rls,
    CASE 
        WHEN COUNT(CASE WHEN NOT rowsecurity THEN 1 END) = 0 
        THEN '✅ All tables secured with RLS'
        ELSE '⚠️ Some tables still need RLS'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'menu_items', 'menus', 'orders', 'pricing_fees', 
        'tip_settings', 'tax_settings', 'coupon_codes', 
        'delivery_zones', 'delivery_zone', 'sms_blasts', 
        'pricing_history'
    );

-- 5. Test queries (these should work for public access)
-- Uncomment to test:

-- Test public read access (should work)
-- SELECT COUNT(*) as menu_items_count FROM public.menu_items;
-- SELECT COUNT(*) as menus_count FROM public.menus;
-- SELECT COUNT(*) as delivery_zones_count FROM public.delivery_zones;

-- Test restricted access (should be limited by RLS)
-- SELECT COUNT(*) as orders_count FROM public.orders;
-- SELECT COUNT(*) as sms_blasts_count FROM public.sms_blasts;
