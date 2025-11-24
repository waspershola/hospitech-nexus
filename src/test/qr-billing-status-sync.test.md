# QR Billing Task Status Sync - Testing Suite
**Version:** QR-BILLING-SYNC-TESTING-V1  
**Last Updated:** 2024-11-24

## Overview
Comprehensive test scenarios validating the 6-phase QR Billing Task Status Sync & Double-Charge Prevention system.

---

## Test Scenario 1: Double-Charge Prevention (Database Level)

### Objective
Verify that the unique partial index `uq_requests_billing_ref_completed` prevents duplicate charges for the same billing reference.

### Prerequisites
- Phase 1 deployed (database foundation with unique index)
- Phase 2 deployed (atomic billing in `folio_post_charge`)

### Test Steps

#### 1.1 Attempt Duplicate Charge - Same Reference
1. Create QR request with "Transfer to Front Desk" → generates `QR-XXXXXX`
2. Navigate to Billing Center → Add Charge with billing reference
3. Enter same billing reference → Charge posts successfully
4. **CRITICAL**: Try to charge same reference again
5. **EXPECTED**: Toast error "This QR billing task has already been processed"
6. **VERIFY**: Database query:
```sql
SELECT billing_status, billed_transaction_id, billed_at 
FROM requests 
WHERE billing_reference_code = 'QR-XXXXXX';
-- Should show status='posted_to_folio', billed_at NOT NULL
```

#### 1.2 Concurrent Charge Attempts (Race Condition Test)
1. Open two browser tabs with Billing Center
2. Enter same billing reference in both tabs
3. Click "Add Charge" simultaneously in both tabs
4. **EXPECTED**: Only ONE charge succeeds, other returns `ALREADY_BILLED`
5. **VERIFY**: `folio_transactions` table shows exactly ONE transaction for this reference

---

## Test Scenario 2: Status Synchronization After Billing

### Objective
Verify that `request.billing_status` updates atomically when charge is posted to folio.

### Test Steps

#### 2.1 Room-Scoped QR Billing
1. Guest in Room 101 orders room service via QR → Request created
2. Department staff clicks "Transfer to Front Desk" → Ref: `QR-ABC123`
3. **VERIFY Initial State**:
```sql
SELECT billing_status, billing_routed_to, billing_reference_code 
FROM requests WHERE id = '<request_id>';
-- billing_status='pending_frontdesk', billing_routed_to='frontdesk'
```
4. Front Desk opens Billing Center → Add Charge → Enter `QR-ABC123`
5. Charge posts successfully to folio
6. **VERIFY Final State**:
```sql
SELECT billing_status, billed_amount, billed_folio_id, billed_transaction_id, billed_at
FROM requests WHERE id = '<request_id>';
-- billing_status='posted_to_folio', all billing fields populated
```

#### 2.2 Location-Scoped QR Billing
1. Guest orders from Pool Bar via QR → Request created (no room association)
2. Bar staff clicks "Transfer to Front Desk" → Ref: `QR-XYZ789`
3. Front Desk processes via Billing Center
4. **VERIFY**: Same status synchronization as 2.1

---

## Test Scenario 3: Status Synchronization After Payment

### Objective
Verify Phase 5 payment pipeline sync updates `billing_status='paid_direct'` when payment collected via folio.

### Test Steps

#### 3.1 Direct Payment Collection (No Folio Charge)
1. QR request created → Ref: `QR-PAY001`
2. Staff clicks "Collect Payment" in QR drawer
3. PaymentForm submits with `requestId` prop
4. **VERIFY Payment Metadata**:
```sql
SELECT metadata FROM payments WHERE transaction_ref LIKE 'PAY-%' 
ORDER BY created_at DESC LIMIT 1;
-- metadata should contain: { "request_id": "<request_id>" }
```
5. **VERIFY Request Status**:
```sql
SELECT billing_status, paid_at FROM requests WHERE id = '<request_id>';
-- billing_status='paid_direct', paid_at NOT NULL
```

#### 3.2 Folio Payment Collection (After Charge Posted)
1. QR request already charged to folio (billing_status='posted_to_folio')
2. Guest checks out → Payment collected via `execute_payment_posting`
3. **VERIFY Phase 5 Sync**:
```sql
SELECT billing_status, paid_at FROM requests 
WHERE billing_reference_code = '<ref>';
-- billing_status='paid_direct', paid_at updated
```

---

## Test Scenario 4: Front Desk Task List Real-Time Updates

### Objective
Verify `/dashboard/qr-billing-tasks` updates in real-time as billing status changes.

### Test Steps

#### 4.1 Real-Time Badge Counter
1. Open `/dashboard/qr-billing-tasks` in Browser Tab A
2. Note badge counter (e.g., "QR Billing Tasks (3)")
3. In Browser Tab B → Process one billing task via Billing Center
4. **EXPECTED**: Tab A badge decrements automatically (3 → 2)
5. **VERIFY**: Real-time subscription via `qr-billing-${tenantId}` channel

#### 4.2 Real-Time List Removal
1. Open `/dashboard/qr-billing-tasks` with 5+ pending tasks visible
2. Process one task via Billing Center in another tab
3. **EXPECTED**: Task disappears from list immediately (no page refresh)
4. **VERIFY**: Supabase realtime subscription filters `billing_status='pending_frontdesk'`

---

## Test Scenario 5: UI Conditional Actions (Phase 4)

### Objective
Verify that "Collect Payment" and "Transfer to Front Desk" buttons hide correctly after billing completed.

### Test Steps

#### 5.1 Hide Actions After Folio Charge
1. Create QR request → Transfer to Front Desk → Charge to folio
2. Open request in QR drawer (from `/dashboard/guest-requests`)
3. **VERIFY**:
   - Green alert shows "Billed to Room Folio"
   - "Collect Payment" button HIDDEN
   - "Transfer to Front Desk" button HIDDEN
   - "Print Receipt" button STILL VISIBLE

#### 5.2 Hide Actions After Direct Payment
1. Create QR request → Collect Payment directly
2. Reopen request in drawer
3. **VERIFY**: Same as 5.1 (actions hidden, green alert visible)

#### 5.3 Billing Status Badges in Table
1. Navigate to `/dashboard/guest-requests`
2. **VERIFY** Billing Status column shows:
   - `none` → Gray outline badge "Not Billed"
   - `pending_frontdesk` → Yellow badge "Pending Front Desk"
   - `posted_to_folio` → Green badge "Billed to Room Folio"
   - `paid_direct` → Green badge "Paid via Room Folio"

---

## Test Scenario 6: Regression - Manual Charges Still Work

### Objective
Ensure that manual charges (not from QR billing tasks) continue to work without regression.

### Test Steps

#### 6.1 Manual Charge Without Billing Reference
1. Navigate to Billing Center for any open folio
2. Click "Add Charge" → Leave billing reference field EMPTY
3. Enter amount, description, department → Submit
4. **EXPECTED**: Charge posts successfully with no errors
5. **VERIFY**: `folio_transactions` table has transaction with NULL `metadata->>'request_id'`

#### 6.2 Manual Payment Without Request ID
1. Collect payment via Room Drawer → No billing reference
2. Payment submits successfully
3. **VERIFY**: Payment recorded with no `request_id` in metadata
4. **VERIFY**: No errors in Phase 5 sync logic (gracefully handles missing request_id)

---

## Test Scenario 7: Edge Cases

### 7.1 Partial Payment Not Handled
**Current Limitation**: System doesn't explicitly track partial payments against QR billing tasks.

**Test Steps**:
1. QR request for ₦10,000 → Transfer to Front Desk
2. Charge ₦10,000 to folio → Status updates to `posted_to_folio`
3. Guest pays ₦5,000 at checkout (partial payment)
4. **VERIFY**: Request `billing_status` remains `posted_to_folio` (NOT `paid_direct`)
5. **EXPECTED**: Only full payment collection updates to `paid_direct`

### 7.2 Request Deleted Before Billing
**Test Steps**:
1. Create QR request → Transfer to Front Desk
2. Manually delete request from database
3. Try to use billing reference in Add Charge
4. **EXPECTED**: Validation returns error "Invalid billing reference"

### 7.3 Cross-Tenant Security
**Test Steps**:
1. Tenant A creates QR billing task → Ref: `QR-TENANT-A`
2. Login as Tenant B staff
3. Try to use `QR-TENANT-A` reference in Billing Center
4. **EXPECTED**: Validation fails (RLS policies enforce tenant isolation)

---

## Success Criteria Checklist

### Double-Charge Prevention ✅
- [ ] Unique index prevents duplicate charges at database level
- [ ] `folio_post_charge` returns `ALREADY_BILLED` error on duplicate
- [ ] Frontend displays toast error on duplicate attempt

### Status Synchronization ✅
- [ ] `billing_status` updates atomically after folio charge
- [ ] `paid_at` timestamp populated on payment collection
- [ ] All billing tracking fields (`billed_amount`, `billed_folio_id`, `billed_transaction_id`) correct

### Payment Pipeline Sync ✅
- [ ] `request_id` included in payment metadata
- [ ] Phase 5 `execute_payment_posting` detects request_id and updates status
- [ ] `billing_status` transitions from `posted_to_folio` → `paid_direct`

### Front Desk Task List ✅
- [ ] Badge counter shows correct count of `pending_frontdesk` tasks
- [ ] Real-time updates when tasks processed in other tabs
- [ ] Task disappears from list after billing processed

### UI Conditional Actions ✅
- [ ] Financial actions hidden when `isBillingCompleted()` returns true
- [ ] Green alert displays billing details
- [ ] Print receipt button always available
- [ ] Billing status badges correct colors in table

### Regression Prevention ✅
- [ ] Manual charges (no billing reference) work normally
- [ ] Manual payments (no request_id) work normally
- [ ] No Phase 5 errors when `request_id` missing from payment metadata

---

## Test Execution Log

| Scenario | Tester | Date | Result | Notes |
|----------|--------|------|--------|-------|
| 1.1 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 1.2 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 2.1 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 2.2 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 3.1 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 3.2 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 4.1 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 4.2 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 5.1 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 5.2 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 5.3 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 6.1 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 6.2 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 7.1 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 7.2 | [Name] | YYYY-MM-DD | ✅/❌ | |
| 7.3 | [Name] | YYYY-MM-DD | ✅/❌ | |

---

## Known Limitations

1. **Partial Payments**: System doesn't explicitly handle partial payments against billing tasks. Only full payment collection updates `billing_status='paid_direct'`.

2. **Manual Request Deletion**: If request is deleted after billing reference generated but before charge posted, billing reference becomes invalid (expected behavior).

3. **No Audit Trail in UI**: While `approval_logs` and `request_activity_log` capture backend events, there's no dedicated UI dashboard for viewing billing audit trails (addressed in Phase 9).

---

## Related Documentation

- [QR Billing Tasks Implementation Plan](./qr-billing-implementation.md)
- [Database Schema Changes](../supabase/migrations/)
- [Phase 5 Payment Pipeline Sync](../supabase/migrations/20251124141615_34a4c800-aba3-40a1-9cab-61f07c3a0d47.sql)
