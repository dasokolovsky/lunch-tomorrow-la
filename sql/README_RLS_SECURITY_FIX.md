# Supabase RLS Security Fix

This guide will help you fix the Row Level Security (RLS) issues identified by Supabase Security Advisor.

## Issues to Fix

The security advisor found these problems:
1. **Policy Exists RLS Disabled**: Tables `menu_items` and `menus` have policies but RLS is not enabled
2. **RLS Disabled in Public**: Multiple tables are exposed to PostgREST but don't have RLS enabled

## Tables That Need RLS

- `menu_items` ✅ (has policies, needs RLS enabled)
- `menus` ✅ (has policies, needs RLS enabled)  
- `orders` ❌ (needs RLS + policies)
- `pricing_fees` ❌ (needs RLS + policies)
- `tip_settings` ❌ (needs RLS + policies)
- `tax_settings` ❌ (needs RLS + policies)
- `coupon_codes` ❌ (needs RLS + policies)
- `delivery_zones` ❌ (needs RLS + policies)
- `delivery_zone` ❌ (needs RLS + policies - old table?)
- `sms_blasts` ❌ (needs RLS + policies)
- `pricing_history` ❌ (needs RLS + policies)

## Step-by-Step Fix

### Step 1: Run the Main Migration

In your Supabase SQL Editor, run the contents of `fix_rls_security_issues.sql`:

```sql
-- Copy and paste the entire contents of fix_rls_security_issues.sql
```

### Step 2: Verify the Fix

Run the verification script `verify_rls_setup.sql` to check that everything is working:

```sql
-- Copy and paste the contents of verify_rls_setup.sql
```

### Step 3: Test Your Application

After applying the RLS policies:

1. **Test Public Access**: Visit your menu page (should work)
2. **Test User Orders**: Login and check order history (should only show user's orders)
3. **Test Admin Access**: Login as admin and check admin pages (should work)

## Security Model Applied

### Public Read Access (Anonymous + Authenticated)
- `menu_items` - Customers need to see menu
- `menus` - Customers need to see available dates
- `delivery_zones` - Address validation
- `pricing_fees` - Checkout calculations
- `tip_settings` - Checkout UI
- `tax_settings` - Checkout calculations
- `coupon_codes` - Coupon validation

### User-Specific Access
- `orders` - Users can only see/modify their own orders

### Admin-Only Access
- `sms_blasts` - Admin email required
- `pricing_history` - Admin email required
- All tables also have admin write access

### Admin Emails
The following emails have admin access:
- `daniel@sokolovsky.com`
- `d@sokolovsky.com`

## Expected Results

After applying these fixes:
- ✅ All security advisor errors should be resolved
- ✅ Public users can browse menu and pricing
- ✅ Authenticated users can manage their orders
- ✅ Admin users can manage all data
- ✅ Sensitive data is protected from unauthorized access

## Rollback Plan

If something goes wrong, you can disable RLS temporarily:

```sql
-- EMERGENCY ROLLBACK - Use only if needed
ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus DISABLE ROW LEVEL SECURITY;
-- ... repeat for other tables
```

Then investigate and reapply with corrections.

## Testing Commands

```sql
-- Test as anonymous user (should work)
SELECT COUNT(*) FROM menu_items;
SELECT COUNT(*) FROM delivery_zones;

-- Test as authenticated user (should be limited)
SELECT COUNT(*) FROM orders; -- Only your orders

-- Test admin access (should work if you're admin)
SELECT COUNT(*) FROM sms_blasts;
```
