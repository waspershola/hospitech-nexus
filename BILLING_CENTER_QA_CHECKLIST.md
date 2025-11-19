# Billing Center QA Testing Checklist
Version: QA-V7
Date: 2025-01-19

## Phase 7: Comprehensive Testing & Validation

### 1. Reservation Payment Auto-Linking ✓
**Test**: Create reservation → Make payment → Check-in guest
- [ ] Payment created with status='success' before check-in
- [ ] Folio created during check-in
- [ ] Payment automatically linked to folio (stay_folio_id populated)
- [ ] Folio balance reflects payment (total_payments updated)
- [ ] Folio transaction created with transaction_type='payment'

**SQL Verification**:
```sql
-- Check orphaned payments (should be 0 after auto-linking)
SELECT COUNT(*) as orphaned_payments
FROM payments
WHERE status IN ('success', 'completed')
  AND booking_id IS NOT NULL
  AND stay_folio_id IS NULL;

-- Verify payment linking for specific booking
SELECT 
  p.id as payment_id,
  p.amount,
  p.status,
  p.stay_folio_id,
  sf.folio_number,
  sf.total_payments
FROM payments p
LEFT JOIN stay_folios sf ON sf.id = p.stay_folio_id
WHERE p.booking_id = 'YOUR_BOOKING_ID'
ORDER BY p.created_at;
```

### 2. Correct Charge/Payment/Balance Display ✓
**Test**: View folio in Billing Center and drawer
- [ ] All charges displayed with correct amounts
- [ ] All payments displayed with correct amounts
- [ ] Balance calculation accurate (charges - payments)
- [ ] Transaction dates/times correct
- [ ] Transaction descriptions clear and informative

**SQL Verification**:
```sql
-- Verify folio balance calculation
SELECT 
  id,
  folio_number,
  total_charges,
  total_payments,
  balance,
  (total_charges - total_payments) as calculated_balance,
  CASE 
    WHEN balance = (total_charges - total_payments) THEN '✅ CORRECT'
    ELSE '❌ MISMATCH'
  END as balance_check
FROM stay_folios
WHERE status = 'open'
ORDER BY created_at DESC
LIMIT 20;
```

### 3. Running Balance Accuracy ✓
**Test**: View Ledger tab with multiple transactions
- [ ] Running balance starts at 0
- [ ] Each charge increases balance correctly
- [ ] Each payment decreases balance correctly
- [ ] Final running balance matches folio.balance
- [ ] Transaction order is chronological

**SQL Verification**:
```sql
-- Verify ledger running balance calculation
WITH ledger AS (
  SELECT 
    folio_id,
    created_at,
    transaction_type,
    amount,
    CASE 
      WHEN transaction_type IN ('charge', 'adjustment_increase') THEN amount
      ELSE 0
    END as debit,
    CASE 
      WHEN transaction_type IN ('payment', 'adjustment_decrease') THEN amount
      ELSE 0
    END as credit,
    SUM(
      CASE 
        WHEN transaction_type IN ('charge', 'adjustment_increase') THEN amount
        ELSE -amount
      END
    ) OVER (PARTITION BY folio_id ORDER BY created_at) as running_balance
  FROM folio_transactions
  WHERE folio_id = 'YOUR_FOLIO_ID'
  ORDER BY created_at
)
SELECT 
  *,
  (SELECT balance FROM stay_folios WHERE id = 'YOUR_FOLIO_ID') as folio_balance,
  CASE 
    WHEN running_balance = (SELECT balance FROM stay_folios WHERE id = 'YOUR_FOLIO_ID')
    THEN '✅ MATCHES'
    ELSE '⚠️ CHECK'
  END as final_balance_check
FROM ledger
ORDER BY created_at DESC
LIMIT 1;
```

### 4. Quick Actions Functionality ✓
**Test**: Use all Quick Actions buttons
- [ ] Add Payment dialog opens and processes payment
- [ ] Add Charge dialog opens and posts charge
- [ ] Transfer button shows multi-folio transfer dialog
- [ ] Merge button available for multiple folios
- [ ] Close/Reopen folio changes status correctly

**Edge Function Logs Check**:
```
# Check create-payment logs
Look for: "PAYMENT-V2.2.1-FINAL-4PARAM"
Verify: Payment posted to folio successfully

# Check folio operations
Look for: "BILLING-CENTER-V2.1-MULTI-FOLIO-UI"
Verify: Quick actions executed without errors
```

### 5. Drawer Payments Tab Instant Loading ✓
**Test**: Open room action drawer → Click Payments tab
- [ ] Tab loads in <500ms (no infinite spinner)
- [ ] Shows "No folio created yet" for reserved bookings
- [ ] Shows payment history for checked-in bookings
- [ ] Displays accurate payment details (method, amount, date)
- [ ] No console errors

**Component Check**:
- File: `src/components/room/drawer/tabs/BookingPaymentManager.tsx`
- Hook: `useFolioById` with pre-check-in handling
- Marker: `PAYMENT-TAB-FIX-V1`

### 6. Closed Folio Viewing ✓
**Test**: Navigate to closed folios (if implemented)
- [ ] Route `/dashboard/folios/closed` accessible
- [ ] Search and filter functionality works
- [ ] Clicking folio opens read-only Billing Center
- [ ] PDF/Email/Print buttons work for closed folios
- [ ] Cannot modify closed folio transactions

**Note**: This feature may not be implemented yet (Phase 3)

### 7. PDF/Email/Print Generation ✓
**Test**: Use all three delivery channels
- [ ] **Download**: Generates actual PDF file (not HTML)
- [ ] **Email**: Sends PDF as attachment to guest email
- [ ] **Print**: Opens print dialog with PDF rendering
- [ ] All three use same luxury hotel template
- [ ] Template includes branding, guest details, ledger, totals

**Edge Function Logs Check**:
```
# generate-folio-pdf
Look for: "PDF-V2.1"
Verify: PDF generated successfully, URL returned

# send-folio-email
Look for: "EMAIL-V1"
Verify: Email sent successfully via Resend

# print-folio
Look for: "PRINT-V1"
Verify: Print data prepared successfully
```

### 8. Night Audit Postings ✓
**Test**: Verify night audit schema fields
- [ ] `night_audit_day` field exists on stay_folios
- [ ] `posting_date` field exists and updates correctly
- [ ] `is_closed_for_day` prevents new postings when true
- [ ] `folio_snapshot` stores JSONB snapshot data
- [ ] `night_audit_status` tracks audit state

**SQL Verification**:
```sql
-- Verify night audit fields
SELECT 
  folio_number,
  night_audit_day,
  posting_date,
  is_closed_for_day,
  night_audit_status,
  folio_snapshot IS NOT NULL as has_snapshot
FROM stay_folios
WHERE night_audit_day IS NOT NULL
ORDER BY night_audit_day DESC
LIMIT 10;

-- Test prepare_folio_for_night_audit function
SELECT prepare_folio_for_night_audit(
  'YOUR_FOLIO_ID'::uuid,
  CURRENT_DATE
);

-- Test complete_night_audit_for_folio function
SELECT complete_night_audit_for_folio('YOUR_FOLIO_ID'::uuid);
```

### 9. Multi-Tab Real-Time Sync ✓
**Test**: Open Billing Center in two browser tabs
- [ ] Make payment in Tab 1
- [ ] Tab 2 updates within 1-2 seconds (no manual refresh)
- [ ] Balance changes reflected in both tabs
- [ ] Transaction list updates in both tabs
- [ ] Sync indicator shows real-time status

**Implementation Check**:
- Hook: `useFolioById`, `useFolioTransactions`, `useFolioLedger`
- Real-time: Supabase channels on `stay_folios`, `folio_transactions`, `payments`
- Cross-tab: `window.postMessage` with `FOLIO_UPDATED` event
- Marker: `HOOKS-REFACTOR-V5`, `REALTIME-SYNC-V1`

---

## Additional Verification Queries

### Tenant Isolation Audit
```sql
-- Verify RLS policies are enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('stay_folios', 'folio_transactions')
  AND schemaname = 'public';

-- Check RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('stay_folios', 'folio_transactions')
ORDER BY tablename, policyname;
```

### Performance Indexes
```sql
-- Verify folio performance indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('stay_folios', 'folio_transactions')
  AND indexname LIKE 'idx_%tenant%'
ORDER BY tablename, indexname;
```

### Hook Cache Key Standardization
```sql
-- This is a code check, not SQL
-- Verify all folio hooks use standardized cache keys:
-- ✅ ['folio', folioId, tenantId]
-- ✅ ['folio-transactions', folioId, tenantId]
-- ✅ ['folio-ledger', folioId, tenantId]
-- ✅ ['guest-snapshot', guestId, tenantId]
```

---

## Known Issues & Limitations

### ✅ Resolved Issues
1. ~~Drawer Payments tab infinite loading~~ → Fixed with `useFolioById` hook
2. ~~PDF/Email/Print returning HTML instead of PDF~~ → Fixed with client-side generation
3. ~~Reservation payments not linking on check-in~~ → Fixed with `attach_booking_payments_to_folio`
4. ~~Payment status mismatch (success vs completed)~~ → Fixed with status array check
5. ~~Missing Night Audit schema fields~~ → Added in Phase 4

### ⚠️ Pending Features
1. **Closed Folios Viewer** (Phase 3) - Not yet implemented
2. **Night Audit Engine** - Schema ready, execution engine pending
3. **Multi-Folio Transfer/Split/Merge** - Dialogs created, integration pending
4. **Platform Fee in QR Services** - Spa/Dining still need platform fee display

### 📋 Pre-Deployment Checklist
- [ ] All 9 QA tests passed
- [ ] Edge functions deployed with version markers
- [ ] Database migrations applied successfully
- [ ] RLS policies verified and tested
- [ ] Performance indexes created
- [ ] Real-time subscriptions tested
- [ ] Cross-tab sync verified
- [ ] PDF generation tested on all delivery channels
- [ ] Tenant isolation verified (no cross-tenant data leaks)
- [ ] Documentation updated

---

## Success Criteria

**Phase 7 is complete when:**
1. All 9 acceptance tests pass ✅
2. All SQL verification queries return expected results ✅
3. No console errors in browser during testing ✅
4. Edge function logs show correct version markers ✅
5. Tenant isolation audit confirms security ✅
6. Performance acceptable (<500ms for common operations) ✅
7. Real-time sync works across multiple tabs ✅

**Current Status**: 🔄 Testing in Progress
**Next Phase**: Phase 8 (Deployment & Rollout)
