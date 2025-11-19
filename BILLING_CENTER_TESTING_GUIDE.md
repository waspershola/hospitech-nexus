# Billing Center Testing Guide
Quick reference for running Phase 7 QA tests

## Quick Start Testing Flow

### 1. Pre-Test Setup
```sql
-- Get a test tenant_id and booking_id
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  b.id as booking_id,
  b.booking_reference,
  b.status,
  r.number as room_number
FROM tenants t
JOIN bookings b ON b.tenant_id = t.id
JOIN rooms r ON r.id = b.room_id
WHERE b.status = 'reserved'
  AND t.deleted_at IS NULL
ORDER BY b.created_at DESC
LIMIT 5;
```

### 2. Test Reservation Payment Auto-Linking

**Step 1**: Create a reservation payment
- Navigate to booking details
- Click "Collect Payment"
- Enter amount: ₦5,000
- Select payment method: Cash
- Submit payment
- **Verify**: Payment created with `stay_folio_id = NULL`

**Step 2**: Check-in the guest
- Click "Check In" button
- Complete check-in process
- **Verify**: Folio created

**Step 3**: Verify auto-linking
```sql
-- Check payment was linked
SELECT 
  p.id,
  p.amount,
  p.status,
  p.stay_folio_id,
  sf.folio_number,
  ft.id as transaction_id
FROM payments p
LEFT JOIN stay_folios sf ON sf.id = p.stay_folio_id
LEFT JOIN folio_transactions ft ON ft.reference_id = p.id::text
WHERE p.booking_id = 'YOUR_BOOKING_ID'
ORDER BY p.created_at;
```

**Expected**:
- ✅ `stay_folio_id` is NOT NULL
- ✅ `folio_transactions` record exists
- ✅ Folio `total_payments` = ₦5,000
- ✅ Folio `balance` = (total_charges - ₦5,000)

### 3. Test Billing Center UI

**Navigate**: `/dashboard/billing/:folioId`

**Check**:
- [ ] Folio header shows correct guest name, room, dates
- [ ] Balance card displays accurate amounts
- [ ] Transaction tab shows all transactions
- [ ] Ledger tab shows running balance
- [ ] Guest Info sidebar displays correctly
- [ ] Quick Actions buttons render
- [ ] Folio Type badge shows (e.g., "Room")

### 4. Test Multi-Folio Display

**If booking has multiple folios**:
```sql
-- Check for multi-folio bookings
SELECT 
  booking_id,
  COUNT(*) as folio_count,
  ARRAY_AGG(folio_type) as folio_types
FROM stay_folios
GROUP BY booking_id
HAVING COUNT(*) > 1
LIMIT 10;
```

**In Billing Center**:
- [ ] Folio Switcher shows all folio types
- [ ] Clicking different tabs loads correct folio data
- [ ] Related Folios panel shows other folios
- [ ] Cross-Folio Summary aggregates correctly

### 5. Test Quick Actions

**Add Payment**:
1. Click "Add Payment" button
2. Fill payment dialog
3. Submit payment
4. **Verify**: Payment appears in transaction list immediately
5. **Verify**: Balance updates in real-time

**Add Charge**:
1. Click "Add Charge" button
2. Fill charge details
3. Submit charge
4. **Verify**: Charge appears in ledger
5. **Verify**: Balance increases correctly

### 6. Test PDF Generation

**Download**:
1. Click "Download PDF" button
2. **Verify**: Browser downloads `.pdf` file
3. **Verify**: PDF opens and displays correctly
4. **Verify**: All folio data is present in PDF

**Email**:
1. Click "Email Invoice" button
2. Confirm guest email
3. Submit
4. **Verify**: Success toast appears
5. **Check email inbox**: PDF received as attachment

**Print**:
1. Click "Print" button
2. **Verify**: Print dialog opens
3. **Verify**: Preview shows PDF rendering
4. Cancel or print

### 7. Test Real-Time Sync

**Setup**: Open Billing Center in two browser tabs

**Test**:
1. In Tab 1: Add a payment of ₦1,000
2. In Tab 2: Watch for updates
3. **Verify**: Tab 2 updates within 1-2 seconds
4. **Verify**: Balance matches in both tabs
5. **Verify**: No manual refresh needed

**Check Console**:
```
Look for: "[REALTIME-SYNC] Folio updated"
Look for: "Invalidating folio queries"
```

### 8. Test Drawer Integration

**Navigate**: Front Desk dashboard

**Test**:
1. Click any checked-in room
2. Room action drawer opens
3. Click "Payments" tab
4. **Verify**: Loads in <500ms (no infinite spinner)
5. **Verify**: Shows accurate payment history
6. Click "View Folio" button
7. **Verify**: Navigates to Billing Center

### 9. Verify Tenant Isolation

**Run as different users**:
```sql
-- Create test query to verify tenant isolation
-- User A (tenant_id: UUID_A)
SELECT COUNT(*) FROM stay_folios; -- Should only see folios for tenant A

-- User B (tenant_id: UUID_B)  
SELECT COUNT(*) FROM stay_folios; -- Should only see folios for tenant B

-- Verify no cross-tenant data leak
SELECT DISTINCT tenant_id FROM stay_folios;
-- Should only return YOUR tenant_id, never other tenants
```

---

## Edge Function Testing

### Check Edge Function Logs

**Supabase Dashboard** → Functions → Logs

**create-payment**:
```
Search for: "PAYMENT-V2.2.1-FINAL-4PARAM"
Expected: Payment posted to folio successfully
```

**generate-folio-pdf**:
```
Search for: "PDF-V2.1"
Expected: PDF generated, URL returned
```

**send-folio-email**:
```
Search for: "EMAIL-V1"
Expected: Email sent via Resend
```

**checkin-guest**:
```
Search for: "CHECKIN-V3-PAYMENT-ATTACH"
Expected: Payments attached to folio
```

---

## Common Issues & Troubleshooting

### Issue: Payment not linking to folio
**Check**:
1. Payment status is 'success' or 'completed'?
2. Booking has an open folio?
3. Edge function logs show payment attachment?

**Fix**:
```sql
-- Manually link orphaned payment
UPDATE payments
SET stay_folio_id = 'YOUR_FOLIO_ID'
WHERE id = 'YOUR_PAYMENT_ID';

-- Then call RPC to post to folio
SELECT execute_payment_posting(
  'TENANT_ID'::uuid,
  'BOOKING_ID'::uuid,
  'PAYMENT_ID'::uuid,
  AMOUNT::numeric
);
```

### Issue: Balance calculation wrong
**Check**:
```sql
-- Verify folio transactions match folio totals
SELECT 
  sf.folio_number,
  sf.total_charges,
  sf.total_payments,
  sf.balance,
  COALESCE(SUM(CASE WHEN ft.transaction_type IN ('charge', 'adjustment_increase') THEN ft.amount ELSE 0 END), 0) as calculated_charges,
  COALESCE(SUM(CASE WHEN ft.transaction_type IN ('payment', 'adjustment_decrease') THEN ft.amount ELSE 0 END), 0) as calculated_payments
FROM stay_folios sf
LEFT JOIN folio_transactions ft ON ft.folio_id = sf.id
WHERE sf.id = 'YOUR_FOLIO_ID'
GROUP BY sf.id, sf.folio_number, sf.total_charges, sf.total_payments, sf.balance;
```

### Issue: Real-time sync not working
**Check**:
1. Supabase realtime enabled on tables?
2. Browser console shows subscription confirmations?
3. Multiple tabs listening to same channel?

**Debug**:
```javascript
// Open browser console
// Look for these logs:
"[useFolioById] Setting up real-time subscription"
"[useFolioTransactions] Real-time update detected"
"[REALTIME-SYNC] Broadcasting FOLIO_UPDATED"
```

### Issue: PDF generation fails
**Check Edge Function Logs**:
- Look for error messages in `generate-folio-pdf` logs
- Verify folio data is complete (guest, booking, transactions)
- Check Supabase Storage bucket permissions

---

## Performance Benchmarks

**Expected Performance**:
- Billing Center page load: <1 second
- Drawer Payments tab load: <500ms
- Real-time sync latency: 1-2 seconds
- PDF generation: 2-4 seconds
- Payment posting: <500ms

**If slower, check**:
- Database indexes exist on tenant_id columns
- RLS policies are optimized
- No N+1 query problems in hooks
- React Query cache is working

---

## Next Steps After Testing

Once all tests pass:
1. ✅ Mark Phase 7 complete
2. 📋 Create deployment checklist
3. 🚀 Prepare for production rollout
4. 📝 Update user documentation
5. 🎓 Train staff on new Billing Center features
