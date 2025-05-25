# Pricing System Database Setup Instructions

## Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project (lunch-tomorrow)
4. Navigate to the **SQL Editor** in the left sidebar

## Step 2: Run the Database Setup

1. In the SQL Editor, create a new query
2. Copy the entire contents of `database/pricing-tables.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute all commands

## Step 3: Verify Tables Were Created

1. Go to **Table Editor** in the left sidebar
2. You should see these new tables:
   - `pricing_fees`
   - `tip_settings`
   - `tax_settings`
   - `coupon_codes`
   - `pricing_history`

## Step 4: Check Sample Data

1. Click on each table to verify data was inserted:
   - **tip_settings**: Should have 1 row with default settings
   - **tax_settings**: Should have 1 row with default tax rate
   - **pricing_fees**: Should have 3 sample fees
   - **coupon_codes**: Should have 2 sample coupons

## Step 5: Enable Real Database Integration

After confirming the tables are created, we need to update the code to use the real database instead of demo mode.

### Update PricingSettings Component

In `src/components/admin/PricingSettings.tsx`, uncomment the database calls:

1. **Line 133-141**: Uncomment the tip settings save
2. **Line 160-168**: Uncomment the tax settings save
3. **Line 189-195**: Replace demo fee addition with real database calls
4. **Line 217-225**: Replace demo fee updates with real database calls
5. **Line 231-235**: Replace demo fee deletion with real database calls

### Update Load Functions

In the same file, remove the try-catch wrappers around database calls (lines 72-116) since tables now exist.

## Step 6: Test the System

1. Go to `/admin/settings` and click the **Pricing & Fees** tab
2. Try adding a new fee
3. Try updating tip settings
4. Try enabling/disabling tax calculation
5. Verify changes are saved and persist on page refresh

## Step 7: Test Customer Experience

1. Add items to cart at `/cart`
2. Verify tip percentages match admin settings
3. Test custom tip input (if enabled)
4. Check that fees are applied correctly
5. Verify tax calculation (if enabled)

## Database Schema Overview

### pricing_fees
- Stores all configurable fees (delivery, service, processing, etc.)
- Supports both percentage and fixed amount fees
- Can set minimum order amounts and maximum fee caps
- Individual enable/disable control

### tip_settings
- Configures tip options for customers
- Preset percentages array (e.g., [18, 20, 25])
- Default tip percentage
- Enable/disable tipping and custom amounts

### tax_settings
- Default tax rate for all orders
- Zone-specific tax rates (JSON object)
- Enable/disable tax calculation

### coupon_codes
- Discount codes with percentage or fixed amounts
- Usage limits and date restrictions
- Minimum order requirements
- Automatic usage tracking

### pricing_history
- Tracks all changes to pricing settings
- Stores old and new values for audit trail
- Links to user who made changes
- Useful for rollbacks and analysis

## Security Notes

- **Row Level Security (RLS)** is enabled on all tables
- **Public read access** for pricing settings (needed for frontend)
- **Authenticated write access** for admin functions
- **Proper indexing** for performance
- **Automatic timestamps** with triggers

## Troubleshooting

### If tables don't create:
1. Check for syntax errors in SQL Editor
2. Ensure you have proper permissions
3. Try running commands one section at a time

### If RLS blocks access:
1. Verify your user is authenticated
2. Check the RLS policies are created correctly
3. Consider temporarily disabling RLS for testing

### If frontend shows errors:
1. Check browser console for specific errors
2. Verify API endpoints can access tables
3. Test with sample data first

## Next Steps

After successful setup:
1. **Customize sample data** to match your business needs
2. **Configure zone-specific pricing** in delivery zones
3. **Add more sophisticated fee rules** as needed
4. **Implement coupon code functionality** in checkout
5. **Set up pricing analytics** and reporting
