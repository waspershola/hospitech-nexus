# QR Billing Task System - Technical Documentation
**For Developers**  
**Version:** DEV-DOCS-V1  
**Last Updated:** 2024-11-24

---

## System Architecture

### Overview
The QR Billing Task system enables department staff to escalate billing operations to Front Desk while maintaining strict separation of duties. All folio charges must be posted exclusively from Billing Center by authorized Front Desk personnel.

### Key Design Principles
1. **Separation of Duties**: Department staff cannot access folios directly
2. **Single Source of Truth**: Billing Center is the only entry point for folio charges
3. **Atomic Transactions**: Database-level constraints prevent race conditions
4. **Real-Time Sync**: Supabase subscriptions enable instant UI updates
5. **Audit Trail**: Complete financial operations logged to `request_activity_log` and `approval_logs`

---

## Database Schema

### Phase 1: Billing Tracking Columns

Added to `requests` table:

```sql
-- Billing tracking fields
billing_reference_code TEXT,  -- Format: QR-XXXXXX
billing_routed_to TEXT CHECK (billing_routed_to IN ('none', 'frontdesk', 'self_collected')),
billing_status TEXT DEFAULT 'none' CHECK (billing_status IN ('none', 'pending_frontdesk', 'posted_to_folio', 'paid_direct', 'cancelled')),
billing_processed_by UUID REFERENCES staff(id),
billing_processed_at TIMESTAMPTZ,

-- Transaction linkage (Phase 1)
billed_amount NUMERIC(10,2),
billed_folio_id UUID REFERENCES stay_folios(id),
billed_transaction_id UUID REFERENCES folio_transactions(id),
billed_at TIMESTAMPTZ,
paid_at TIMESTAMPTZ,
```

### Indices

```sql
-- Front Desk queue filtering
CREATE INDEX idx_requests_billing_status ON requests(billing_status) 
WHERE billing_status = 'pending_frontdesk';

-- Billing reference lookups
CREATE INDEX idx_requests_billing_reference ON requests(billing_reference_code);

-- Routing lookups
CREATE INDEX idx_requests_billing_routing ON requests(billing_routed_to);
```

### Unique Constraint (Double-Charge Prevention)

```sql
-- Prevent one billing reference from being charged twice
CREATE UNIQUE INDEX uq_requests_billing_ref_completed
ON requests (billing_reference_code)
WHERE billing_status IN ('posted_to_folio', 'paid_direct');
```

**How it works**: PostgreSQL partial index only enforces uniqueness when `WHERE` condition is TRUE. Multiple requests can have same `billing_reference_code` if `billing_status='none'` or `'pending_frontdesk'`, but once status transitions to `'posted_to_folio'`, the reference becomes immutable.

---

## Backend Implementation

### Phase 2: Atomic Billing in `folio_post_charge`

**File**: `supabase/functions/.../folio_post_charge.sql`

**Signature**:
```sql
CREATE FUNCTION folio_post_charge(
  p_folio_id TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_request_id UUID DEFAULT NULL,  -- NEW: Phase 2
  p_billing_reference_code TEXT DEFAULT NULL  -- NEW: Phase 2
)
```

**Critical Logic**:
```sql
-- Lock request row to prevent race conditions
SELECT * INTO v_request
FROM requests
WHERE id = p_request_id
  AND tenant_id = v_tenant_id
FOR UPDATE;

-- Check if already billed
IF v_request.billing_status IN ('posted_to_folio', 'paid_direct')
   OR v_request.billed_transaction_id IS NOT NULL THEN
  RETURN jsonb_build_object(
    'success', false,
    'code', 'ALREADY_BILLED',
    'error', 'This QR billing task has already been processed',
    'billed_at', v_request.billed_at,
    'billed_amount', v_request.billed_amount,
    'version', 'QR-BILLING-SYNC-PHASE-2-V1'
  );
END IF;

-- Atomically update request billing status
UPDATE requests
SET
  billing_status = 'posted_to_folio',
  billing_reference_code = COALESCE(billing_reference_code, p_billing_reference_code),
  billed_amount = p_amount,
  billed_folio_id = v_folio_id,
  billed_transaction_id = v_transaction_id,
  billed_at = NOW()
WHERE id = p_request_id
  AND tenant_id = v_tenant_id;
```

**Why `SELECT FOR UPDATE`?**  
Locks the row for the duration of the transaction, preventing concurrent updates. If two staff members attempt to charge same reference simultaneously, one will wait for the other's transaction to complete, then receive `ALREADY_BILLED` error.

---

### Phase 5: Payment Pipeline Sync in `execute_payment_posting`

**File**: `supabase/migrations/20251124141615_34a4c800-aba3-40a1-9cab-61f07c3a0d47.sql`

**Critical Addition**:
```sql
-- Check if this payment is linked to a QR request
SELECT metadata INTO v_payment_metadata
FROM payments
WHERE id = p_payment_id AND tenant_id = p_tenant_id;

-- Extract request_id from payment metadata
IF v_payment_metadata ? 'request_id' THEN
  v_request_id := (v_payment_metadata->>'request_id')::UUID;
  
  -- Update request billing status to paid_direct
  UPDATE requests
  SET
    billing_status = CASE 
      WHEN billing_status = 'posted_to_folio' THEN 'paid_direct'
      ELSE billing_status
    END,
    paid_at = NOW()
  WHERE id = v_request_id
    AND tenant_id = p_tenant_id
    AND billing_status = 'posted_to_folio';  -- Only update if currently posted
END IF;
```

**Why conditional update?**  
Only transitions `posted_to_folio` → `paid_direct`. If status is already `'paid_direct'` or `'none'`, no update occurs. This prevents overwriting status if payment processed multiple times.

---

## Frontend Implementation

### Phase 3: Frontend Integration

**Component**: `src/modules/finance/add-charge/FrontDeskAddChargeModal.tsx`

**Key Changes**:
1. Pass `p_request_id` and `p_billing_reference_code` to `folio_post_charge` RPC
2. Handle `ALREADY_BILLED` error code with toast notification
3. Remove redundant frontend `billing_status` update (now backend-only)

**Code Snippet**:
```typescript
const { data, error } = await supabase.rpc('folio_post_charge', {
  p_folio_id: `${normalizedFolioId}`.trim(),
  p_amount: parseFloat(formData.amount),
  p_description: formData.description || 'Charge',
  p_reference_type: formData.charge_type || 'service',
  p_reference_id: null,
  p_department: formData.department || 'front_desk',
  p_request_id: validatedRequestId || null,  // PHASE-3
  p_billing_reference_code: billingReference || null,  // PHASE-3
});

if (data?.code === 'ALREADY_BILLED') {
  toast.error('Already Billed', {
    description: 'This QR billing task has already been processed',
  });
  return;
}
```

---

### Phase 4: UI Conditional Actions

**Component**: `src/components/qr-management/QRRequestActions.tsx`

**Billing Status Helper**: `src/lib/qr/billingStatus.ts`

```typescript
export function isBillingCompleted(billingStatus?: string | null): boolean {
  return billingStatus === 'posted_to_folio' || billingStatus === 'paid_direct';
}

export function shouldHideFinancialActions(billingStatus?: string | null): boolean {
  return isBillingCompleted(billingStatus);
}
```

**Usage**:
```typescript
const billingCompleted = isBillingCompleted(request.billing_status);

{billingCompleted && (
  <Alert className="border-green-500 bg-green-50">
    <CheckCircle className="h-4 w-4 text-green-600" />
    <AlertDescription>
      <strong>Billed to Room Folio</strong>
      <div>₦{billedAmount.toLocaleString()} charged on {format(new Date(request.billed_at), 'MMM d, h:mm a')}</div>
    </AlertDescription>
  </Alert>
)}

{!billingCompleted && (
  <>
    <Button onClick={() => setShowPaymentForm(true)}>
      <DollarSign className="h-4 w-4 mr-2" />
      Collect Payment
    </Button>
    <Button onClick={() => setShowTransferDialog(true)}>
      <MoveRight className="h-4 w-4 mr-2" />
      Transfer to Front Desk
    </Button>
  </>
)}
```

---

### Phase 6: Critical Payment Integration Fix

**Component**: `src/modules/payments/PaymentForm.tsx`

**Key Change**: Pass `request_id` in payment metadata for Phase 5 automatic sync

```typescript
recordPayment({
  // ... other params
  metadata: {
    notes: data.notes,
    provider_name: selectedProvider.name,
    provider_fee: selectedProvider.fee_percent,
    ...(requestId ? { request_id: requestId } : {}),  // PHASE-6
  },
});
```

**Component**: `src/components/qr-management/QRRequestActions.tsx`

**Removed**: Manual `billing_status` update (now handled by Phase 5 backend)

```typescript
// PHASE-6: Removed manual update, now automatic via Phase 5
<PaymentForm
  requestId={request.id}  // PHASE-6: Pass requestId
  onSuccess={async () => {
    // No manual status update needed
    setShowPaymentForm(false);
    handleStatusChange('completed');
  }}
/>
```

---

## Real-Time Subscriptions

### QR Billing Tasks Page

**Component**: `src/pages/dashboard/QRBillingTasks.tsx`

**Subscription Logic**:
```typescript
useEffect(() => {
  if (!tenantId) return;

  const channel = supabase
    .channel(`qr-billing-${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'requests',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        // Invalidate queries to refetch data
        queryClient.invalidateQueries({ 
          queryKey: ['qr-billing-tasks', tenantId] 
        });
        
        // Play notification sound for INSERT events
        if (payload.eventType === 'INSERT') {
          playNotificationSound();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [tenantId, queryClient]);
```

**Badge Counter**:
```typescript
const { data: billingTasks } = useQuery({
  queryKey: ['qr-billing-tasks', tenantId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('billing_status', 'pending_frontdesk')
      .order('transferred_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
});

const taskCount = billingTasks?.length || 0;
```

---

## Security & Permissions

### RLS Policies

All `requests` table operations enforce tenant isolation:

```sql
CREATE POLICY "requests_select_policy" ON requests
FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "requests_update_policy" ON requests
FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### Permission Checks

**Billing Center Access**: Restricted to `'owner'`, `'manager'`, `'finance_manager'`, `'front_desk'` roles.

**Frontend Check**:
```typescript
const canAccessBillingCenter = ['owner', 'manager', 'finance_manager', 'front_desk'].includes(userRole);
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Meaning | Frontend Action |
|------|------------|---------|----------------|
| `ALREADY_BILLED` | 400 | Duplicate charge attempt | Toast error, disable button |
| `INVALID_FOLIO_ID_FORMAT` | 400 | Malformed UUID | Toast error, retry |
| `FOLIO_NOT_FOUND` | 404 | Folio doesn't exist | Toast error, verify folio ID |
| `FOLIO_CLOSED` | 400 | Cannot charge closed folio | Toast error, prevent submission |
| `REQUEST_NOT_FOUND` | 404 | Request ID invalid | Toast error, re-validate reference |

### Error Response Format

```json
{
  \"success\": false,
  \"code\": \"ALREADY_BILLED\",
  \"error\": \"This QR billing task has already been processed\",
  \"billed_at\": \"2024-11-24T14:30:00Z\",
  \"billed_amount\": 5000,
  \"billed_folio_id\": \"uuid\",
  \"billed_transaction_id\": \"uuid\",
  \"billing_status\": \"posted_to_folio\",
  \"version\": \"QR-BILLING-SYNC-PHASE-2-V1\"
}
```

---

## Deployment Checklist

### Phase 1: Database Foundation
- [ ] Migration `20251124_qr_billing_tasks_phase_1.sql` deployed
- [ ] Unique index `uq_requests_billing_ref_completed` created
- [ ] Indices for performance created
- [ ] RLS policies verified

### Phase 2: Backend - Atomic Billing
- [ ] `folio_post_charge` function updated with `p_request_id`, `p_billing_reference_code` params
- [ ] `SELECT FOR UPDATE` row locking implemented
- [ ] `ALREADY_BILLED` error code returned correctly
- [ ] Tested via SQL console

### Phase 3: Frontend Integration
- [ ] `FrontDeskAddChargeModal.tsx` updated
- [ ] Billing reference validation RPC call added
- [ ] Error handling for `ALREADY_BILLED` code
- [ ] Toast notifications working

### Phase 4: UI Conditional Actions
- [ ] `billingStatus.ts` helper created
- [ ] `QRRequestActions.tsx` hides actions correctly
- [ ] Billing status badges added to `RequestsTable.tsx`
- [ ] Green alert displays billing details

### Phase 5: Payment Pipeline Sync
- [ ] `execute_payment_posting` function updated
- [ ] `request_id` extraction from payment metadata
- [ ] `billing_status` update to `'paid_direct'` on payment collection
- [ ] Tested via checkout flow

### Phase 6: Critical Payment Integration Fix
- [ ] `PaymentForm.tsx` passes `request_id` in metadata
- [ ] `QRRequestActions.tsx` passes `requestId` prop to PaymentForm
- [ ] Manual `billing_status` update removed
- [ ] End-to-end payment flow tested

---

## Performance Considerations

### Database Query Optimization

**Indexed Queries**:
```sql
-- Fast: Uses idx_requests_billing_status
SELECT * FROM requests 
WHERE billing_status = 'pending_frontdesk' 
AND tenant_id = 'xyz';

-- Fast: Uses idx_requests_billing_reference
SELECT * FROM requests 
WHERE billing_reference_code = 'QR-ABC123';
```

**Slow Queries to Avoid**:
```sql
-- Slow: Full table scan without billing_status filter
SELECT * FROM requests 
WHERE transferred_to_frontdesk = true;  -- No index on this column
```

### Real-Time Subscription Performance

**Efficient**: Filter subscriptions at database level
```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'requests',
  filter: `tenant_id=eq.${tenantId}`,  // ✅ Server-side filter
})
```

**Inefficient**: Filter after receiving all changes
```typescript
.on('postgres_changes', { event: '*', table: 'requests' })
.subscribe((payload) => {
  if (payload.new.tenant_id === tenantId) { // ❌ Client-side filter
    // Handle change
  }
});
```

---

## Troubleshooting

### Issue: Payments Not Updating Status to `paid_direct`

**Diagnosis**:
```sql
-- Check if request_id in payment metadata
SELECT metadata FROM payments 
WHERE transaction_ref LIKE 'PAY-%' 
ORDER BY created_at DESC LIMIT 1;
```

**Expected**: `{ \"request_id\": \"uuid\", ... }`

**If Missing**: Phase 6 not deployed correctly. Verify `PaymentForm.tsx` passes `requestId` prop.

---

### Issue: Duplicate Charges Not Prevented

**Diagnosis**:
```sql
-- Check if unique index exists
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'requests' 
AND indexname = 'uq_requests_billing_ref_completed';
```

**Expected**: Index with partial `WHERE billing_status IN ('posted_to_folio', 'paid_direct')`

**If Missing**: Phase 1 migration not deployed. Re-run migration.

---

### Issue: Real-Time Updates Not Working

**Diagnosis**:
1. Check browser console for subscription errors
2. Verify Supabase project has real-time enabled
3. Check RLS policies allow SELECT on `requests` table
4. Verify `tenant_id` filter in subscription matches user's tenant

**Fix**: Ensure Supabase realtime is enabled in project settings and RLS policies grant proper access.

---

## Related Files

### Database Migrations
- `supabase/migrations/20251124_qr_billing_tasks_phase_1.sql` - Phase 1 foundation
- `supabase/migrations/20251124_folio_post_charge_phase_2.sql` - Phase 2 atomic billing
- `supabase/migrations/20251124141615_34a4c800-aba3-40a1-9cab-61f07c3a0d47.sql` - Phase 5 payment sync

### Frontend Components
- `src/components/qr-management/QRRequestActions.tsx` - QR request actions
- `src/modules/finance/add-charge/FrontDeskAddChargeModal.tsx` - Unified add charge modal
- `src/pages/dashboard/QRBillingTasks.tsx` - Front Desk billing task list
- `src/modules/payments/PaymentForm.tsx` - Payment collection form

### Utilities
- `src/lib/qr/billingStatus.ts` - Billing status helper functions
- `src/lib/qr/requestReference.ts` - Billing reference code generation

---

## API Reference

### RPC Functions

#### `folio_post_charge`
**Purpose**: Post charge to folio with atomic QR billing status update

**Parameters**:
```typescript
{
  p_folio_id: string,  // UUID as TEXT
  p_amount: number,
  p_description: string,
  p_reference_type?: string,
  p_reference_id?: string,
  p_department?: string,
  p_request_id?: string,  // Phase 2
  p_billing_reference_code?: string,  // Phase 2
}
```

**Returns**:
```json
{
  \"success\": true,
  \"folio_id\": \"uuid\",
  \"transaction_id\": \"uuid\",
  \"new_balance\": 5000,
  \"total_charges\": 10000,
  \"request_id\": \"uuid\",
  \"billing_status\": \"posted_to_folio\",
  \"version\": \"QR-BILLING-SYNC-PHASE-2-V1\"
}
```

---

## Future Enhancements

### Phase 9: Audit Dashboard (Planned)
- Dedicated "Billing History" page showing all QR billing tasks
- Timeline view with request → charge → payment lifecycle
- Filters by date range, department, billing status
- CSV export for compliance audits

### Partial Payment Support (Planned)
- Track multiple partial payments against single billing task
- Update status to `paid_direct` only when full amount collected
- Display "Partially Paid" badge with amount remaining

---

## Contact & Support

For questions or issues with the QR Billing Task system:
- **Development Team**: [Your Team Email]
- **Documentation**: `/docs/qr-billing-*.md`
- **Testing Suite**: `/src/test/qr-billing-status-sync.test.md`
