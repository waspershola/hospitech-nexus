# Platform Fee System - End-to-End Testing Guide

## Overview
This guide provides comprehensive steps to test the Platform Fee Configuration & Billing System across bookings and QR guest payments.

## System Components

### 1. Database Tables
- ✅ `platform_fee_configurations` - Per-tenant fee settings
- ✅ `platform_fee_ledger` - Transaction-level fee records
- ✅ `platform_invoices` - Monthly aggregated invoices

### 2. Edge Functions
- ✅ `create-booking` - Applies fees to bookings (lines 24-126, called at 439-445)
- ✅ `qr-request` - Applies fees to QR payments (lines 30-100+)
- ✅ `platform-fee-billing` - Monthly aggregation and invoicing

### 3. UI Components
- ✅ `FeeConfigModal` - Platform admin fee configuration
- ✅ `PlatformFeesTab` - Tenant fee summary and ledger view
- ✅ Integration in Platform Dashboard tenant dropdown

## Pre-Test Setup

### Step 1: Verify Default Fee Configuration
When a tenant is created, a default fee configuration should be automatically created via the `assign_default_fee_configuration` trigger.

**Check via Supabase SQL Editor:**
```sql
SELECT 
  pfc.id,
  pfc.tenant_id,
  t.name as tenant_name,
  pfc.fee_type,
  pfc.booking_fee,
  pfc.qr_fee,
  pfc.billing_cycle,
  pfc.payer,
  pfc.active,
  pfc.trial_exemption_enabled,
  pfc.trial_days,
  pt.trial_end_date,
  pt.status as platform_status
FROM platform_fee_configurations pfc
JOIN tenants t ON t.id = pfc.tenant_id
LEFT JOIN platform_tenants pt ON pt.id = pfc.tenant_id
ORDER BY pfc.created_at DESC
LIMIT 5;
```

**Expected Result:**
- Active tenants (not in trial): `active = true`
- Trial tenants: `active = false` (if trial_end_date > now())
- Default fees: `booking_fee = 2.00`, `qr_fee = 1.00`, `fee_type = 'percentage'`
- Default payer: `payer = 'property'`, `mode = 'exclusive'`
- Default billing: `billing_cycle = 'realtime'`

### Step 2: Create Test Tenant (if needed)
1. Navigate to `/dashboard/platform-admin?tab=tenants`
2. Click "Create Tenant"
3. Fill in details:
   - Hotel Name: "Test Hotel Fee System"
   - Owner Email: unique email
   - Plan: Any plan
4. Submit and verify default fee config is created

## Test Scenario 1: Booking Fee Application (Realtime)

### Step 1: Configure Fee (Optional - test admin UI)
1. Go to `/dashboard/platform-admin?tab=tenants`
2. Click dropdown menu (⋮) for test tenant
3. Select "Fee Configuration"
4. Verify current settings or modify:
   - Fee Type: Percentage
   - Booking Fee: 2%
   - Billing Cycle: Realtime
   - Payer: Property
   - Active: ON
5. Save configuration

### Step 2: Create Test Booking
1. Login as the test tenant owner
2. Navigate to Bookings page
3. Create new booking:
   - Guest: Select or create test guest
   - Room: Any available room
   - Check-in: Tomorrow
   - Check-out: Day after tomorrow
   - Total Amount: e.g., ₦50,000
4. Confirm booking creation

### Step 3: Verify Fee Calculation
**Expected Fee:**
- Base Amount: ₦50,000
- Fee (2%): ₦1,000
- Net to Property: ₦49,000 (if payer = 'property')

**Check Booking Edge Function Logs:**
Navigate to Supabase Dashboard → Functions → create-booking → Logs

Look for:
```
[platform-fee] Applied booking fee: {
  tenant_id: "...",
  booking_id: "...",
  amount: 50000,
  fee_amount: 1000,
  net_amount: 49000,
  payer: "property",
  billing_cycle: "realtime"
}
```

### Step 4: Verify Ledger Entry
**Via Supabase SQL Editor:**
```sql
SELECT 
  pfl.*,
  t.name as tenant_name,
  b.booking_reference
FROM platform_fee_ledger pfl
JOIN tenants t ON t.id = pfl.tenant_id
LEFT JOIN bookings b ON b.id = pfl.reference_id::uuid
WHERE pfl.reference_type = 'booking'
ORDER BY pfl.created_at DESC
LIMIT 10;
```

**Expected Result:**
- `reference_type = 'booking'`
- `reference_id` = booking UUID
- `base_amount = 50000`
- `fee_amount = 1000`
- `rate = 2.00`
- `fee_type = 'percentage'`
- `billing_cycle = 'realtime'`
- `payer = 'property'`
- `status = 'billed'` (realtime billing)
- `billed_at` = timestamp (not null for realtime)

### Step 5: Verify Tenant Finance Center Display
1. Login as tenant owner
2. Navigate to `/dashboard/finance-center`
3. Scroll to "Platform Fees" section
4. Verify display shows:
   - **Fee Summary Cards:**
     - Total Fees: ₦1,000
     - Billed Amount: ₦1,000
     - Pending Amount: ₦0
     - Current Rate: 2% bookings, 1% QR
   - **Current Configuration** (read-only)
   - **Detailed Ledger Table:**
     - Date, Type (Booking), Base Amount, Fee, Rate, Billing Cycle, Status

## Test Scenario 2: QR Payment Fee Application

### Step 1: Create QR Code
1. Login as tenant
2. Navigate to QR Management
3. Create QR code for a room or common area
4. Ensure "Digital Menu" service is enabled

### Step 2: Place QR Order
1. Open QR portal: `/qr/{token}`
2. Navigate to Digital Menu
3. Add items to cart (Total: e.g., ₦10,000)
4. Place order

### Step 3: Verify QR Fee Calculation
**Expected Fee:**
- Base Amount: ₦10,000
- Fee (1%): ₦100
- Net to Property: ₦9,900

**Check qr-request Edge Function Logs:**
Look for:
```
[platform-fee] Applied QR fee: {
  tenant_id: "...",
  request_id: "...",
  amount: 10000,
  fee_amount: 100,
  service_category: "digital_menu"
}
```

### Step 4: Verify Ledger Entry
```sql
SELECT 
  pfl.*,
  r.service_category,
  r.note
FROM platform_fee_ledger pfl
JOIN requests r ON r.id = pfl.reference_id::uuid
WHERE pfl.reference_type = 'qr_payment'
ORDER BY pfl.created_at DESC
LIMIT 10;
```

**Expected Result:**
- `reference_type = 'qr_payment'`
- `reference_id` = request UUID
- `base_amount = 10000`
- `fee_amount = 100`
- `rate = 1.00`
- `status = 'billed'`

## Test Scenario 3: Trial Exemption

### Step 1: Create Trial Tenant
1. Create new tenant with trial period
2. Verify in SQL:
```sql
SELECT 
  t.name,
  pt.trial_end_date,
  pt.status,
  pfc.active,
  pfc.trial_exemption_enabled
FROM tenants t
JOIN platform_tenants pt ON pt.id = t.id
JOIN platform_fee_configurations pfc ON pfc.tenant_id = t.id
WHERE t.id = 'YOUR_TRIAL_TENANT_ID';
```

**Expected:**
- `trial_end_date` is in the future
- `pfc.active = false` (trigger sets inactive during trial)
- `pfc.trial_exemption_enabled = true`

### Step 2: Create Booking During Trial
1. Login as trial tenant
2. Create booking with ₦50,000 total
3. Complete booking

### Step 3: Verify No Fee Applied
**Check Ledger:**
```sql
SELECT COUNT(*) as fee_count
FROM platform_fee_ledger
WHERE tenant_id = 'YOUR_TRIAL_TENANT_ID';
```

**Expected Result:** `fee_count = 0` (no fees during trial)

**Check Edge Function Logs:**
Look for:
```
[platform-fee] Tenant in trial period, skipping fee. Trial ends: [date]
```

## Test Scenario 4: Monthly Billing Cycle

### Step 1: Configure Monthly Billing
1. Go to Platform Admin
2. Edit tenant fee config
3. Change:
   - Billing Cycle: Monthly
4. Save

### Step 2: Create Multiple Bookings
1. Create 3 bookings with totals: ₦50,000, ₦75,000, ₦100,000
2. Verify bookings created successfully

### Step 3: Verify Pending Ledger Entries
```sql
SELECT 
  tenant_id,
  COUNT(*) as transaction_count,
  SUM(base_amount) as total_base,
  SUM(fee_amount) as total_fees
FROM platform_fee_ledger
WHERE status = 'pending'
  AND billing_cycle = 'monthly'
  AND tenant_id = 'YOUR_TENANT_ID'
GROUP BY tenant_id;
```

**Expected Result:**
- `transaction_count = 3`
- `total_base = 225000`
- `total_fees = 4500` (2% of 225,000)
- All entries have `status = 'pending'`
- `billed_at = null`

### Step 4: Test Monthly Billing Function
**Manually trigger:**
```bash
# Via Supabase Dashboard or curl
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/platform-fee-billing' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

### Step 5: Verify Invoice Creation
```sql
SELECT 
  pi.*,
  t.name as tenant_name
FROM platform_invoices pi
JOIN tenants t ON t.id = pi.tenant_id
WHERE pi.tenant_id = 'YOUR_TENANT_ID'
ORDER BY pi.created_at DESC
LIMIT 1;
```

**Expected Result:**
- `invoice_number` = 'INV-YYYY-MM-####'
- `amount = 4500`
- `status = 'pending'`
- `due_date` = 7 days from today
- `description` includes transaction count and base amount

### Step 6: Verify Ledger Status Update
```sql
SELECT 
  status,
  billed_at,
  invoice_id,
  COUNT(*) as count
FROM platform_fee_ledger
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND billing_cycle = 'monthly'
GROUP BY status, billed_at, invoice_id;
```

**Expected Result:**
- All entries now have `status = 'billed'`
- `billed_at` = timestamp
- `invoice_id` = UUID of created invoice

## Test Scenario 5: Payer Modes (Guest vs Property)

### Step 1: Test Property Pays (Exclusive)
**Configuration:**
- Payer: Property
- Mode: Exclusive
- Booking Amount: ₦50,000
- Fee (2%): ₦1,000

**Expected:**
- Property receives: ₦49,000
- Platform collects: ₦1,000
- Guest pays: ₦50,000

### Step 2: Test Guest Pays (Inclusive)
**Change Configuration:**
1. Edit fee config
2. Set Payer: Guest
3. Set Mode: Inclusive

**Create Booking:**
- Base Amount: ₦50,000
- Fee (2%): ₦1,000

**Expected:**
- Property receives: ₦50,000 (full amount)
- Platform collects: ₦1,000
- Guest pays: ₦51,000 (base + fee)

**Note:** Current implementation focuses on property pays mode. Guest pays mode requires frontend integration to add fee to guest's total.

## Test Scenario 6: Flat Rate Fees

### Step 1: Configure Flat Rate
1. Edit fee config
2. Change Fee Type: Flat Rate
3. Set Booking Fee: ₦500 (fixed per booking)
4. Set QR Fee: ₦50 (fixed per order)

### Step 2: Create Varying Bookings
- Booking 1: ₦10,000 → Fee: ₦500
- Booking 2: ₦100,000 → Fee: ₦500
- Booking 3: ₦1,000,000 → Fee: ₦500

### Step 3: Verify Consistent Fee
```sql
SELECT 
  base_amount,
  fee_amount,
  rate,
  fee_type
FROM platform_fee_ledger
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND fee_type = 'flat'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** All entries have `fee_amount = 500` regardless of base_amount

## Verification Checklist

### Database Integrity
- [ ] Default fee config created for new tenants
- [ ] Ledger entries link to correct bookings/requests
- [ ] Invoice generation works for monthly billing
- [ ] Trial tenants have `active = false` in config

### Edge Function Logic
- [ ] Booking fee calculation correct (percentage & flat)
- [ ] QR payment fee calculation correct
- [ ] Trial exemption works (no fees during trial)
- [ ] Realtime billing creates `status = 'billed'` immediately
- [ ] Monthly billing creates `status = 'pending'` entries
- [ ] Non-blocking: booking succeeds even if fee fails

### UI Display
- [ ] Platform Admin can edit fee configs via modal
- [ ] Tenant sees fee summary cards with correct totals
- [ ] Tenant sees current configuration (read-only)
- [ ] Tenant sees detailed ledger table with all fees
- [ ] Fee config modal shows in tenant dropdown menu

### Business Logic
- [ ] Property pays mode: fee deducted from property revenue
- [ ] Guest pays mode: fee added to guest total (requires frontend)
- [ ] Billable services only: menu, room service, spa, laundry
- [ ] Non-billable services: housekeeping, maintenance, concierge
- [ ] Trial period correctly calculated from trial_days or trial_end_date

## Common Issues & Troubleshooting

### Issue: No fee applied to booking
**Check:**
1. Is tenant in trial? (`trial_end_date > now()`)
2. Is fee config active? (`active = true`)
3. Does `applies_to` include 'bookings'?
4. Check edge function logs for errors

### Issue: Ledger entry not created
**Check:**
1. Edge function logs for errors
2. Database permissions (service role key)
3. RLS policies on platform_fee_ledger table

### Issue: Monthly billing not creating invoices
**Check:**
1. Are there pending fees? (`status = 'pending'`)
2. Is billing_cycle set to 'monthly'?
3. Run SQL to verify pending fees exist
4. Check platform-fee-billing function logs

### Issue: Tenant doesn't see fees in Finance Center
**Check:**
1. Is PlatformFeesTab component rendered?
2. Is usePlatformFeeConfig hook working?
3. Check browser console for errors
4. Verify tenant_id is passed correctly

## Success Criteria

✅ **Complete Success** when:
1. Default fee config created for new tenants
2. Booking creates ledger entry with correct fee
3. QR order creates ledger entry with correct fee
4. Trial tenants exempt from fees
5. Realtime billing shows `status = 'billed'` immediately
6. Monthly billing aggregates and creates invoice
7. Tenant sees fee summary, config, and ledger in Finance Center
8. Platform admin can edit tenant fee configs via modal
9. Edge functions log comprehensively for debugging
10. System handles errors gracefully (non-blocking)

## Next Steps After Testing

1. **Monitor Production:**
   - Set up alerts for failed fee applications
   - Track monthly invoice generation
   - Monitor trial-to-paid transitions

2. **Enhance UI:**
   - Add fee breakdown in booking confirmation
   - Show fee impact in receipt generation
   - Display guest vs property payment split

3. **Add Analytics:**
   - Platform revenue dashboard
   - Fees by tenant comparison
   - Monthly revenue trends
   - Billing cycle performance

4. **Email Notifications:**
   - Send invoice emails to tenants
   - Notify on payment collection
   - Alert on upcoming due dates

## Test Results Log

Document your test results below:

```
Test Date: _______
Tester: _______

[ ] Test Scenario 1: Booking Fee (Realtime) - PASS/FAIL
    Notes: ___________

[ ] Test Scenario 2: QR Payment Fee - PASS/FAIL
    Notes: ___________

[ ] Test Scenario 3: Trial Exemption - PASS/FAIL
    Notes: ___________

[ ] Test Scenario 4: Monthly Billing - PASS/FAIL
    Notes: ___________

[ ] Test Scenario 5: Payer Modes - PASS/FAIL
    Notes: ___________

[ ] Test Scenario 6: Flat Rate Fees - PASS/FAIL
    Notes: ___________

Overall System Status: PASS/FAIL
```
