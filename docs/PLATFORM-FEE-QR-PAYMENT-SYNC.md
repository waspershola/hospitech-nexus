# Platform Fee QR Payment Sync - Implementation Guide

## Overview
Complete implementation of platform fee recording for QR payments, ensuring all QR service payments are properly tracked in the `platform_fee_ledger` table.

## Problem Statement
Platform fees were being calculated and displayed in QR portal but not recorded in the ledger because:
- QR portal components bypass the `qr-request` edge function
- Direct Supabase client calls to `requests` and `guest_orders` tables
- Payment collection handlers didn't invoke fee recording logic

## Solution Architecture

### 1. Server-Side Fee Recording Edge Function
**File:** `supabase/functions/record-platform-fee/index.ts`

**Purpose:** Secure, centralized platform fee recording when payment is collected

**Features:**
- Reverse-calculates platform fee from collected amount
- Checks trial exemption status
- Supports both guest-pays inclusive and property-pays exclusive modes
- Non-blocking: payment collection succeeds even if fee recording fails
- Creates audit trail in `finance_audit_events`

**Request Format:**
```json
{
  "request_id": "uuid",
  "tenant_id": "uuid",
  "service_category": "digital_menu|room_service|laundry|spa|dining_reservation",
  "amount": 1000,
  "payment_location": "Main Restaurant",
  "payment_method": "Cash"
}
```

### 2. Payment Collection Integration

**OrderDetailsDrawer.tsx** (Menu/Room Service)
- Calls `record-platform-fee` after payment metadata update
- Non-blocking error handling
- Invalidates platform fee queries for real-time UI sync

**QRRequestDrawer.tsx** (All Services)
- Universal payment handler for all service types
- Calls `record-platform-fee` after successful payment collection
- Includes service category, amount, location, and method details

### 3. React Hook for Fee Recording
**File:** `src/hooks/useRecordPlatformFee.ts`

**Usage:**
```tsx
const recordPlatformFee = useRecordPlatformFee();

await recordPlatformFee.mutateAsync({
  request_id: 'uuid',
  tenant_id: 'uuid',
  service_category: 'digital_menu',
  amount: 1000,
  payment_location: 'Main Restaurant',
  payment_method: 'Cash',
});
```

### 4. Backfill Script (Optional)
**File:** `supabase/functions/backfill-platform-fees/index.ts`

**Purpose:** One-time script to populate missing platform fee ledger entries for past payments

**Process:**
1. Query all paid QR requests without ledger entries
2. Reverse-calculate platform fee from payment amount
3. Insert entries with `status='settled'` and `backfilled: true` metadata
4. Report summary: backfilled, skipped, errors

**Run manually via Supabase Functions:**
```bash
curl -X POST https://akchmpmzcupzjaeewdui.supabase.co/functions/v1/backfill-platform-fees \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

## Fee Calculation Logic

### Guest Pays (Inclusive Mode)
Frontend includes fee in total → Backend extracts fee for ledger

**Percentage Fee:**
```
base_amount = amount / (1 + rate/100)
fee_amount = amount - base_amount
```

**Flat Fee:**
```
fee_amount = configured_flat_rate
base_amount = amount - fee_amount
```

### Property Pays (Exclusive Mode)
Guest pays base amount → Property bears fee cost

**Percentage Fee:**
```
base_amount = amount
fee_amount = amount * (rate/100)
```

**Flat Fee:**
```
base_amount = amount
fee_amount = configured_flat_rate
```

## Testing Checklist

### Phase 1: Digital Menu Order
- [ ] Place menu order via QR portal (₦1,000 base + ₦200 fee = ₦1,200)
- [ ] Staff collects payment via OrderDetailsDrawer
- [ ] Verify platform fee ledger entry created:
  - `reference_type: 'qr_payment'`
  - `reference_id: <request_id>`
  - `base_amount: 1000`
  - `fee_amount: 200`
  - `status: 'billed'` (realtime) or `'pending'` (monthly)
- [ ] Check Finance Center → Platform Fees tab shows fee
- [ ] Check Platform Admin → Fee Revenue shows fee

### Phase 2: Room Service Order
- [ ] Place room service order via QR portal
- [ ] Staff collects payment via QRRequestDrawer
- [ ] Verify platform fee ledger entry created
- [ ] Verify fee appears in both tenant and admin dashboards

### Phase 3: Laundry Service
- [ ] Place laundry order via QR portal (₦500 base + ₦100 fee = ₦600)
- [ ] Staff collects payment via QRRequestDrawer
- [ ] Verify platform fee ledger entry
- [ ] Check service_category metadata in ledger

### Phase 4: Spa Booking
- [ ] Book spa service via QR portal
- [ ] Staff collects payment
- [ ] Verify platform fee recorded

### Phase 5: Dining Reservation (with amount adjustment)
- [ ] Create dining reservation (no initial amount)
- [ ] Staff adjusts amount to ₦2,000
- [ ] Staff collects payment (₦2,000 + ₦400 fee = ₦2,400)
- [ ] Verify platform fee ledger entry with correct amounts

### Phase 6: Trial Tenant Exemption
- [ ] Test with trial tenant (trial_end_date > now())
- [ ] Collect payment
- [ ] Verify NO platform fee ledger entry created
- [ ] Check edge function logs show "Trial exemption active"

### Phase 7: Property Pays Mode
- [ ] Configure fee with payer='property', mode='exclusive'
- [ ] Place order and collect payment
- [ ] Verify fee ledger entry shows correct payer
- [ ] Verify guest doesn't see fee in UI

### Phase 8: Sync Verification
- [ ] Compare Finance Center "Total Fees" with sum of collected payments
- [ ] Verify Outstanding Fees calculation accurate
- [ ] Check all QR services appear in Fee Ledger
- [ ] Test date range filtering shows correct fees

## Edge Function Logs

**Successful Fee Recording:**
```
[record-platform-fee] Recording fee for request: abc-123 tenant: def-456
[record-platform-fee] Fee recorded successfully: ghi-789
```

**Trial Exemption:**
```
[record-platform-fee] Tenant in trial period, fee exempted
```

**No Active Config:**
```
[record-platform-fee] No active fee config found, skipping fee recording
```

## Database Schema

### platform_fee_ledger
```sql
- tenant_id: uuid (FK to tenants)
- reference_type: 'qr_payment' | 'booking'
- reference_id: uuid (FK to requests)
- base_amount: numeric
- fee_amount: numeric
- rate: numeric
- fee_type: 'percentage' | 'flat'
- billing_cycle: 'realtime' | 'monthly'
- payer: 'guest' | 'property'
- status: 'pending' | 'billed' | 'settled' | 'failed' | 'waived'
- metadata: jsonb (service_category, payment details)
```

## Known Limitations

1. **Non-Blocking Architecture**
   - Payment collection succeeds even if fee recording fails
   - Check edge function logs for fee recording errors
   - May require manual backfill if systematic failures occur

2. **Backfill Script**
   - One-time use for historical data
   - Marks entries with `backfilled: true` metadata
   - Cannot determine exact original payment date (uses request created_at)

3. **Service Category Standardization**
   - Must use correct service_category values
   - 'digital_menu' (not 'menu_order')
   - See PROJECT_MEMORY for full list

## Deployment

### Edge Functions
```bash
# Deploy record-platform-fee (already deployed)
supabase functions deploy record-platform-fee

# Optional: Deploy backfill script
supabase functions deploy backfill-platform-fees
```

### Config Updates
Added to `supabase/config.toml`:
```toml
[functions.record-platform-fee]
verify_jwt = true

[functions.backfill-platform-fees]
verify_jwt = true
```

## Monitoring

### Key Metrics
- Total QR payment fees recorded
- Fee recording success rate
- Fee ledger sync accuracy
- Outstanding fees pending settlement

### Dashboards
- **Tenant:** Finance Center → Platform Fees tab
- **Admin:** Platform Dashboard → Fee Revenue tab

### Audit Trail
All fee recordings create `finance_audit_events` entries:
```json
{
  "event_type": "platform_fee_recorded",
  "target_id": "<ledger_entry_id>",
  "payload": {
    "request_id": "uuid",
    "service_category": "digital_menu",
    "base_amount": 1000,
    "fee_amount": 200,
    "rate": 20,
    "billing_cycle": "realtime",
    "payer": "guest"
  }
}
```

## Support

### Common Issues

**Q: Fees not appearing in ledger**
- Check edge function logs for errors
- Verify fee configuration is active
- Confirm `applies_to` includes 'qr_payments'
- Check trial exemption status

**Q: Fee amount incorrect**
- Verify frontend calculation matches backend reverse-calculation
- Check fee_type (percentage vs flat)
- Confirm payer mode (inclusive vs exclusive)

**Q: Payment collected but fee missing**
- Non-blocking design means payment succeeds even if fee fails
- Check `finance_audit_events` for platform_fee_recorded entries
- Run backfill script to populate missing fees

### Debug Steps
1. Check edge function deployment status
2. Review edge function logs for request
3. Verify platform fee configuration active
4. Check RLS policies allow fee insertion
5. Test with platform admin account
6. Run backfill script for historical corrections

## Future Enhancements

1. **Real-time Monitoring**
   - Alert when fee recording fails
   - Dashboard for fee sync health

2. **Automated Backfill**
   - Scheduled job to catch missed fees
   - Daily reconciliation check

3. **Fee Recording Retry**
   - Automatic retry on transient failures
   - Queue system for failed recordings

4. **Enhanced Reporting**
   - Fee breakdown by service type
   - Tenant-specific fee analytics
   - Payment method attribution
