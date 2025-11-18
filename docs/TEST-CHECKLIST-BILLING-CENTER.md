# Billing Center Integration - Test Checklist

## Pre-Test Setup

### Environment Requirements
- [ ] Local Supabase instance running or connected to dev environment
- [ ] Database migrations applied (check latest migration timestamp)
- [ ] Edge functions deployed (verify `checkin-guest` has V3 marker)
- [ ] Admin/Manager user authenticated with test tenant

### Test Data Preparation
```sql
-- Verify test tenant exists
SELECT id, name FROM tenants WHERE slug = 'test-hotel' LIMIT 1;

-- Create test guest if needed
INSERT INTO guests (tenant_id, name, email, phone)
VALUES ('<tenant_id>', 'Test Guest', 'test@example.com', '+2348012345678')
ON CONFLICT DO NOTHING
RETURNING id;

-- Create test room if needed
INSERT INTO rooms (tenant_id, number, type, status)
VALUES ('<tenant_id>', '999', 'Deluxe', 'available')
ON CONFLICT DO NOTHING
RETURNING id;
```

---

## Test Suite

### Test 1: Reservation Payment → Check-in → Folio Link

**Objective**: Verify reservation-time payments automatically attach to folio on check-in.

#### Steps:
1. **Create Booking** (status: 'reserved')
   - Navigate to `/dashboard/bookings/new`
   - Select test guest, room 999, dates: today → tomorrow
   - Complete booking (note `booking_id`)

2. **Record Reservation Payment**
   - Open Front Desk dashboard
   - Find booking in "Reserved" section
   - Click booking → Open drawer
   - Click "Quick Payment" button
   - Record payment: ₦5,000, method: Cash, location: Front Desk
   - **Expected**: Success toast, payment recorded

3. **Verify Payment Pre-Check-in**
   ```sql
   -- Should show NULL stay_folio_id
   SELECT id, transaction_ref, amount, stay_folio_id, status
   FROM payments
   WHERE booking_id = '<booking_id>'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - **Expected**: `stay_folio_id IS NULL`, `status = 'completed'`

4. **Check-in Guest**
   - In drawer, click "Check In" button
   - Confirm check-in action
   - **Expected**: Success toast, room status changes to "Occupied"

5. **Verify Payment Post-Check-in**
   ```sql
   -- Should now show stay_folio_id populated
   SELECT id, transaction_ref, amount, stay_folio_id, status
   FROM payments
   WHERE booking_id = '<booking_id>'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - **Expected**: `stay_folio_id NOT NULL`, links to new folio

6. **Verify Folio Transaction Created**
   ```sql
   -- Should show payment transaction
   SELECT ft.id, ft.transaction_type, ft.amount, ft.description, ft.reference_id
   FROM folio_transactions ft
   JOIN stay_folios sf ON sf.id = ft.folio_id
   WHERE sf.booking_id = '<booking_id>'
   AND ft.transaction_type = 'payment'
   ORDER BY ft.created_at DESC;
   ```
   - **Expected**: 1 transaction, `transaction_type = 'payment'`, `amount = 5000`

7. **Verify Folio Balance**
   ```sql
   SELECT id, total_charges, total_payments, balance
   FROM stay_folios
   WHERE booking_id = '<booking_id>';
   ```
   - **Expected**: `total_payments = 5000`, `balance = total_charges - 5000`

8. **Check Audit Trail**
   ```sql
   SELECT event_type, payload
   FROM finance_audit_events
   WHERE target_id = (SELECT id FROM payments WHERE booking_id = '<booking_id>' LIMIT 1)
   AND event_type = 'payment_auto_attached_to_folio'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - **Expected**: 1 event with booking_id, folio_id in payload

#### Pass Criteria:
- ✅ Payment `stay_folio_id` populated after check-in
- ✅ Folio transaction created with correct amount
- ✅ Folio balance reflects payment (reduced by ₦5,000)
- ✅ Audit event logged
- ✅ No errors in check-in flow

---

### Test 2: "View Folio" Button - Drawer Navigation

**Objective**: Verify "View Folio" button navigates to Billing Center.

#### Steps:
1. **Open Drawer Pre-Check-in**
   - Navigate to Front Desk
   - Click on reserved booking (from Test 1 setup)
   - **Expected**: Drawer opens

2. **Check Button State (Pre-Check-in)**
   - Look for "View Folio" button in drawer header
   - **Expected**: Button NOT visible (no folio exists yet)

3. **Check-in Guest** (if not already done)
   - Click "Check In" in drawer
   - Wait for success toast

4. **Check Button State (Post-Check-in)**
   - Drawer should still be open (or reopen it)
   - Look for "View Folio" button
   - **Expected**: Button IS visible with FileText icon

5. **Click "View Folio" Button**
   - Click the button
   - **Expected**: Navigation to `/dashboard/billing/<folio_id>`
   - **Expected**: Browser console shows: `VIEW-FOLIO-BUTTON-V1: Navigating to billing center`

6. **Verify Billing Center Loads**
   - Page should display:
     - Guest name, booking reference
     - Folio summary (charges, payments, balance)
     - Transaction table with reservation payment
     - Action buttons (PDF, Email, Print)
   - **Expected**: All data loads correctly, no errors

#### Pass Criteria:
- ✅ Button hidden pre-check-in
- ✅ Button visible post-check-in
- ✅ Button click navigates to correct route
- ✅ Console log shows version marker
- ✅ Billing Center loads with correct folio data

---

### Test 3: Real-Time Cross-Tab Sync

**Objective**: Verify folio updates in one tab reflect in other tabs.

#### Steps:
1. **Setup Multi-Tab Environment**
   - **Tab 1**: Open Front Desk, open drawer for checked-in booking
   - **Tab 2**: Navigate to `/dashboard/billing/<folio_id>` for same booking
   - **Tab 3**: Open Finance Center (optional, for broader verification)

2. **Record Payment in Tab 2 (Billing Center)**
   - In Tab 2, click "Record Payment" or similar action
   - Record payment: ₦2,000, method: Card
   - **Expected**: Success toast, folio balance updates in Tab 2

3. **Verify Drawer Updates (Tab 1)**
   - Switch to Tab 1 (drawer should still be open)
   - Wait up to 2 seconds
   - **Expected**: Folio balance in drawer updates to reflect new payment
   - **Expected**: Console shows: `[drawer] Cross-tab folio update received - refetching`

4. **Record Payment in Tab 1 (Drawer)**
   - In Tab 1 drawer, click "Quick Payment"
   - Record payment: ₦1,500, method: Cash
   - **Expected**: Success toast

5. **Verify Billing Center Updates (Tab 2)**
   - Switch to Tab 2
   - **Expected**: Folio balance updates within 2 seconds
   - **Expected**: New transaction appears in transaction table

6. **Check Browser Console**
   - Both tabs should show `FOLIO_UPDATED` event logs
   - Tab 1: `window.postMessage` sent after payment
   - Tab 2: Event received and queries invalidated

#### Pass Criteria:
- ✅ Tab 1 updates when Tab 2 records payment (< 2 sec)
- ✅ Tab 2 updates when Tab 1 records payment (< 2 sec)
- ✅ Console logs show event broadcasting and receiving
- ✅ No race conditions or stale data
- ✅ All transaction totals match across tabs

---

### Test 4: Multiple Reservation Payments

**Objective**: Verify multiple reservation payments all attach correctly.

#### Steps:
1. **Create New Booking**
   - Create booking for tomorrow (status: 'reserved')

2. **Record Multiple Payments**
   - Payment 1: ₦3,000 (Cash)
   - Payment 2: ₦2,000 (Bank Transfer)
   - Payment 3: ₦1,000 (Card)
   - **Total**: ₦6,000

3. **Verify All Payments Pre-Check-in**
   ```sql
   SELECT COUNT(*), SUM(amount) as total_amount
   FROM payments
   WHERE booking_id = '<booking_id>'
   AND stay_folio_id IS NULL
   AND status = 'completed';
   ```
   - **Expected**: `COUNT = 3`, `total_amount = 6000`

4. **Check-in Guest**
   - Perform check-in via drawer

5. **Verify All Payments Attached**
   ```sql
   SELECT COUNT(*), SUM(amount) as total_amount
   FROM payments
   WHERE booking_id = '<booking_id>'
   AND stay_folio_id IS NOT NULL
   AND status = 'completed';
   ```
   - **Expected**: `COUNT = 3`, `total_amount = 6000`

6. **Verify Folio Transactions**
   ```sql
   SELECT COUNT(*), SUM(amount) as total_amount
   FROM folio_transactions ft
   JOIN stay_folios sf ON sf.id = ft.folio_id
   WHERE sf.booking_id = '<booking_id>'
   AND ft.transaction_type = 'payment';
   ```
   - **Expected**: `COUNT = 3`, `total_amount = 6000`

7. **Check Edge Function Logs**
   ```bash
   supabase functions logs checkin-guest --limit 20
   ```
   - **Expected**: Logs show `CHECKIN-V3-PAYMENT-ATTACH` with:
     - `payments_posted: 3`
     - `payments_failed: 0`

#### Pass Criteria:
- ✅ All 3 payments attached (not just 1)
- ✅ Folio balance reflects all payments (₦6,000 credited)
- ✅ 3 folio transactions created
- ✅ Edge function logs confirm all posted

---

### Test 5: Backfill Verification

**Objective**: Verify one-time backfill migration linked orphaned payments.

#### Steps:
1. **Check Pre-Backfill Orphan Count**
   ```sql
   -- Run this BEFORE applying backfill migration
   SELECT COUNT(*) as orphans_before
   FROM payments p
   JOIN bookings b ON b.id = p.booking_id
   LEFT JOIN stay_folios sf ON sf.booking_id = b.id AND sf.status = 'open'
   WHERE p.stay_folio_id IS NULL
     AND p.status = 'completed'
     AND b.status IN ('checked_in', 'completed')
     AND sf.id IS NOT NULL; -- Has open folio but payment not linked
   ```
   - **Note**: Count before migration

2. **Apply Backfill Migration**
   ```bash
   supabase db push
   ```
   - **Expected**: Migration applies successfully

3. **Check Database Logs**
   - Supabase Dashboard → Database → Logs
   - Search for: `BACKFILL-ORPHAN-PAYMENTS-V1`
   - **Expected**: Logs show:
     - `Starting backfill`
     - `Processed X bookings`
     - `Posted: Y payments`

4. **Check Post-Backfill Orphan Count**
   ```sql
   -- Same query as step 1
   SELECT COUNT(*) as orphans_after
   FROM payments p
   JOIN bookings b ON b.id = p.booking_id
   LEFT JOIN stay_folios sf ON sf.booking_id = b.id AND sf.status = 'open'
   WHERE p.stay_folio_id IS NULL
     AND p.status = 'completed'
     AND b.status IN ('checked_in', 'completed')
     AND sf.id IS NOT NULL;
   ```
   - **Expected**: `orphans_after` should be 0 or significantly lower

5. **Verify Sample Folio Balances**
   ```sql
   -- Check 5 random folios that received backfilled payments
   SELECT 
     sf.id,
     sf.booking_id,
     b.booking_reference,
     sf.total_payments,
     sf.balance,
     COUNT(ft.id) as payment_transactions
   FROM stay_folios sf
   JOIN bookings b ON b.id = sf.booking_id
   LEFT JOIN folio_transactions ft ON ft.folio_id = sf.id AND ft.transaction_type = 'payment'
   WHERE sf.status = 'open'
   GROUP BY sf.id, sf.booking_id, b.booking_reference
   ORDER BY RANDOM()
   LIMIT 5;
   ```
   - **Expected**: Balances accurate, payment_transactions > 0

6. **Check Audit Events**
   ```sql
   SELECT COUNT(*) as backfill_events
   FROM finance_audit_events
   WHERE event_type = 'payment_auto_attached_to_folio'
   AND created_at > NOW() - INTERVAL '10 minutes'; -- Adjust based on when migration ran
   ```
   - **Expected**: Count matches number of payments backfilled

#### Pass Criteria:
- ✅ Orphan count reduced to 0 or near-0
- ✅ Backfill logs show successful processing
- ✅ Sample folios have correct balances
- ✅ Audit events created for all backfilled payments
- ✅ No errors during migration

---

### Test 6: Edge Case - Failed Payment Attachment

**Objective**: Verify check-in succeeds even if payment attachment fails.

#### Steps:
1. **Simulate Failure Condition**
   - Temporarily modify DB to create scenario where `folio_post_payment` might fail
   - **Option A**: Create payment with invalid amount (negative)
   - **Option B**: Create payment for different tenant (cross-tenant scenario - should never happen but test resilience)

2. **Attempt Check-in**
   - Create booking with problematic payment
   - Perform check-in

3. **Verify Check-in Succeeds**
   - **Expected**: Check-in completes successfully
   - **Expected**: Folio created
   - **Expected**: Room status updated to "Occupied"

4. **Verify Payment NOT Attached**
   ```sql
   SELECT stay_folio_id FROM payments WHERE id = '<problematic_payment_id>';
   ```
   - **Expected**: `stay_folio_id IS NULL` (attachment failed but check-in succeeded)

5. **Check Edge Function Logs**
   ```bash
   supabase functions logs checkin-guest --limit 10
   ```
   - **Expected**: Error logged: `Payment attachment failed (non-blocking)`
   - **Expected**: Check-in flow continued despite error

6. **Manual Fix**
   - Correct the problematic payment
   - Manually call attachment function:
   ```sql
   SELECT attach_booking_payments_to_folio(
     '<tenant_id>'::uuid,
     '<booking_id>'::uuid,
     '<folio_id>'::uuid
   );
   ```
   - **Expected**: Function returns `{success: true, payments_posted: 1}`

#### Pass Criteria:
- ✅ Check-in succeeds despite payment attachment failure
- ✅ Non-blocking error handling works correctly
- ✅ Error logged but user not affected
- ✅ Manual fix-up possible via function call
- ✅ No data corruption (folio still valid)

---

### Test 7: Performance - Bulk Check-ins

**Objective**: Verify system handles multiple check-ins with payments efficiently.

#### Steps:
1. **Setup 10 Bookings**
   - Create 10 bookings for tomorrow
   - Record 2 reservation payments each (₦3,000 + ₦2,000)
   - **Total**: 10 bookings × 2 payments = 20 payments to attach

2. **Perform Bulk Check-ins**
   - Check in all 10 bookings sequentially
   - Measure average check-in time
   - **Target**: < 2 seconds per check-in

3. **Verify All Payments Attached**
   ```sql
   SELECT 
     b.booking_reference,
     COUNT(p.id) as payment_count,
     SUM(p.amount) as total_amount,
     SUM(CASE WHEN p.stay_folio_id IS NOT NULL THEN 1 ELSE 0 END) as attached_count
   FROM bookings b
   JOIN payments p ON p.booking_id = b.id
   WHERE b.booking_reference LIKE 'BKG-2025%' -- Adjust filter
   GROUP BY b.booking_reference
   ORDER BY b.created_at DESC
   LIMIT 10;
   ```
   - **Expected**: All bookings show `payment_count = 2`, `attached_count = 2`

4. **Check System Performance**
   - No timeouts
   - No database connection pool exhaustion
   - Edge function logs show consistent execution times

#### Pass Criteria:
- ✅ All 20 payments attached across 10 check-ins
- ✅ Average check-in time < 2 seconds
- ✅ No performance degradation
- ✅ No errors in edge function logs
- ✅ Database performance remains stable

---

## Regression Tests

### Ensure Existing Functionality Unchanged

#### Test A: Post-Checkout Payments
- [ ] Create booking, check-in, check-out
- [ ] Record payment after checkout
- [ ] **Verify**: Payment does NOT attach to closed folio
- [ ] **Verify**: Payment goes to post-checkout ledger (if implemented)

#### Test B: Manual Payment Recording (No Booking)
- [ ] Go to Finance Center → Payments
- [ ] Record standalone payment (no booking association)
- [ ] **Verify**: Payment creates successfully
- [ ] **Verify**: No errors related to folio attachment

#### Test C: QR Guest Payments
- [ ] Guest orders via QR menu for checked-in room
- [ ] Order amount should post to folio
- [ ] **Verify**: QR payment still posts correctly
- [ ] **Verify**: Folio balance updates

#### Test D: Booking Cancellation
- [ ] Create booking with reservation payment
- [ ] Cancel booking before check-in
- [ ] **Verify**: Payment remains (not deleted)
- [ ] **Verify**: Payment `stay_folio_id` remains NULL (no folio created)

---

## Cleanup

### Post-Test Cleanup
```sql
-- Delete test bookings (cascade will delete related records)
DELETE FROM bookings WHERE guest_id IN (
  SELECT id FROM guests WHERE email = 'test@example.com'
);

-- Delete test guest
DELETE FROM guests WHERE email = 'test@example.com';

-- Delete test room
DELETE FROM rooms WHERE number = '999';

-- Clear test audit events (optional)
DELETE FROM finance_audit_events 
WHERE created_at > NOW() - INTERVAL '1 hour'
AND payload->>'booking_id' IN ('<test_booking_ids>');
```

---

## Sign-Off

### Test Completion Checklist
- [ ] All 7 main tests passed
- [ ] All regression tests passed
- [ ] Edge function logs reviewed (no unexpected errors)
- [ ] Database queries validated
- [ ] Performance benchmarks met
- [ ] Cleanup completed

### Sign-Off
- **Tester Name**: ___________________________
- **Date**: ___________________________
- **Environment**: [ ] Local  [ ] Staging  [ ] Production
- **Result**: [ ] Pass  [ ] Fail  [ ] Pass with Notes

**Notes**:
_________________________________________________________
_________________________________________________________
_________________________________________________________

---

## Appendix: Useful Commands

### Edge Function Commands
```bash
# View recent check-in logs
supabase functions logs checkin-guest --limit 50

# Deploy updated function
supabase functions deploy checkin-guest

# Test function locally
supabase functions serve checkin-guest
```

### Database Commands
```bash
# Apply migrations
supabase db push

# Generate migration diff
supabase db diff

# Reset local database (WARNING: destroys data)
supabase db reset
```

### Debugging Queries
```sql
-- Find booking by reference
SELECT * FROM bookings WHERE booking_reference = 'BKG-2025-XXX';

-- Trace payment lifecycle
SELECT 
  p.id,
  p.transaction_ref,
  p.amount,
  p.status,
  p.stay_folio_id,
  p.created_at,
  b.booking_reference,
  sf.id as folio_id
FROM payments p
JOIN bookings b ON b.id = p.booking_id
LEFT JOIN stay_folios sf ON sf.id = p.stay_folio_id
WHERE p.transaction_ref = 'PAY-XXX';

-- Check folio transaction count
SELECT 
  sf.booking_id,
  COUNT(CASE WHEN ft.transaction_type = 'payment' THEN 1 END) as payment_count,
  COUNT(CASE WHEN ft.transaction_type = 'charge' THEN 1 END) as charge_count,
  sf.total_payments,
  sf.total_charges,
  sf.balance
FROM stay_folios sf
LEFT JOIN folio_transactions ft ON ft.folio_id = sf.id
WHERE sf.id = '<folio_id>'
GROUP BY sf.id;
```
