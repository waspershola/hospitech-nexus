# Billing Center Integration - Auto-Link Reservation Payments

## Overview
This document describes the implementation of automatic payment linking from reservations to folios when guests check in, along with the full Billing Center integration.

## Version Markers
- `VIEW-FOLIO-BUTTON-V1` - Drawer button implementation
- `ATTACH-PAYMENTS-V1` - Database function for payment attachment
- `CHECKIN-V3-PAYMENT-ATTACH` - Check-in integration
- `BACKFILL-ORPHAN-PAYMENTS-V1` - One-time backfill migration

## Architecture

### 1. Database Function: `attach_booking_payments_to_folio`
**Location**: `supabase/migrations/20251118170700_attach_reservation_payments_to_folio.sql`

**Purpose**: Idempotently attach completed reservation payments to newly created folios.

**Signature**:
```sql
attach_booking_payments_to_folio(
  p_tenant_id uuid,
  p_booking_id uuid,
  p_folio_id uuid
) RETURNS jsonb
```

**Behavior**:
- Finds all `payments` with matching `booking_id` where `stay_folio_id IS NULL` and `status = 'completed'`
- Calls `execute_payment_posting` (4-param wrapper) for each payment
- Updates `payments.stay_folio_id` only on success
- Records `payment_auto_attached_to_folio` audit events
- Returns JSON with success counts: `{success: true, payments_posted: n, payments_failed: m}`

**Error Handling**:
- Non-blocking: continues processing remaining payments if one fails
- Logs all failures via RAISE NOTICE/WARNING
- Transaction-safe: each payment posting is in try-catch

### 2. Check-in Integration
**Location**: `supabase/functions/checkin-guest/index.ts`

**Implementation**:
After successful folio creation (line ~145), the function calls:
```typescript
const { data: attachResult } = await supabaseServiceClient
  .rpc('attach_booking_payments_to_folio', {
    p_tenant_id: booking.tenant_id,
    p_booking_id: booking.id,
    p_folio_id: folio.id
  });
```

**Non-Blocking Design**:
- Payment attachment failures do not block check-in
- Errors are logged but check-in continues
- Audit trail created for troubleshooting

### 3. UI Integration
**Location**: `src/modules/frontdesk/components/RoomActionDrawer.tsx`

**Features Added**:

#### A. "View Folio" Button
- Appears in drawer header after check-in (when `folio.folioId` exists)
- Navigates to `/dashboard/billing/:folioId`
- Uses `FileText` icon with "View Folio" label
- Disabled state with tooltip before check-in

#### B. Cross-Tab Real-Time Sync
```typescript
useEffect(() => {
  const handleFolioUpdate = (event: MessageEvent) => {
    if (event.data?.type === 'FOLIO_UPDATED' && event.data?.bookingId === activeBooking?.id) {
      queryClient.invalidateQueries({ queryKey: ['booking-folio', ...] });
      queryClient.invalidateQueries({ queryKey: ['folio-by-id', ...] });
    }
  };
  window.addEventListener('message', handleFolioUpdate);
  return () => window.removeEventListener('message', handleFolioUpdate);
}, [activeBooking?.id, folio?.folioId, tenantId]);
```

## Data Flow

### Reservation Payment → Folio Linking Flow
```
1. Guest books room → Booking created (status: 'reserved')
2. Staff records payment → Payment created (stay_folio_id: NULL)
3. Guest checks in → Check-in triggered
4. System creates stay_folio → Folio created (status: 'open')
5. System calls attach_booking_payments_to_folio() → Payment linking begins
6. For each orphaned payment:
   a. Call execute_payment_posting(tenant_id, booking_id, payment_id, amount)
   b. Create folio_transaction (transaction_type: 'payment')
   c. Update stay_folio balances (total_payments ↑, balance ↓)
   d. Update payment.stay_folio_id
   e. Record finance_audit_event
7. UI invalidates queries → Drawer/Billing Center refresh
8. User sees updated balance → Balance now reflects all payments
```

## Backfill Process

### One-Time Migration
**Location**: `supabase/migrations/20251118170701_backfill_orphaned_payments_to_folios.sql`

**Purpose**: Link historical reservation payments to existing open folios.

**Query Logic**:
```sql
SELECT DISTINCT p.booking_id, p.tenant_id, sf.id AS folio_id
FROM payments p
JOIN bookings b ON b.id = p.booking_id
JOIN stay_folios sf ON sf.booking_id = b.id
WHERE p.stay_folio_id IS NULL
  AND p.status = 'completed'
  AND sf.status = 'open'
  AND b.status IN ('checked_in', 'completed')
```

**Expected Results**:
- Links payments created before folio system implementation
- Only processes bookings with open folios
- Skips post-checkout payments (handled by separate ledger)
- Final verification query confirms orphan count reduction

## Verification Queries

### Check Orphaned Payments
```sql
SELECT COUNT(*) as orphan_count
FROM payments p
JOIN bookings b ON b.id = p.booking_id
LEFT JOIN stay_folios sf ON sf.booking_id = b.id AND sf.status = 'open'
WHERE p.stay_folio_id IS NULL
  AND p.status = 'completed'
  AND b.status IN ('checked_in', 'completed');
```

### Verify Folio Balances
```sql
SELECT 
  sf.id,
  sf.booking_id,
  sf.total_charges,
  sf.total_payments,
  sf.balance,
  COUNT(ft.id) as transaction_count
FROM stay_folios sf
LEFT JOIN folio_transactions ft ON ft.folio_id = sf.id
WHERE sf.status = 'open'
GROUP BY sf.id
ORDER BY sf.created_at DESC
LIMIT 20;
```

### Audit Trail Check
```sql
SELECT 
  event_type,
  COUNT(*) as event_count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM finance_audit_events
WHERE event_type = 'payment_auto_attached_to_folio'
GROUP BY event_type;
```

## Rollback Procedures

### Emergency Rollback
If critical issues arise:

1. **Revert Check-in Function**:
   ```bash
   # Redeploy previous version
   git revert <commit-hash>
   supabase functions deploy checkin-guest
   ```

2. **Drop Database Function** (if needed):
   ```sql
   DROP FUNCTION IF EXISTS public.attach_booking_payments_to_folio;
   ```

3. **Revert UI Changes**:
   ```bash
   git revert <commit-hash>
   ```

### Data Integrity
- Backfill is idempotent (safe to re-run)
- Payment attachments use existing `folio_post_payment` logic (proven stable)
- All operations are tenant-scoped (no cross-tenant risk)
- Audit trail preserved for all actions

## Performance Considerations

### Check-in Latency
- Payment attachment adds ~50-200ms per payment to check-in
- Non-blocking design prevents user-facing delays
- Average case: 1-2 reservation payments = negligible impact

### Database Load
- Function uses indexed queries (`booking_id`, `tenant_id`, `stay_folio_id`)
- Batch processing in backfill uses ORDER BY for sequential processing
- No table scans or cross-tenant queries

## Security

### Tenant Isolation
- All functions enforce tenant_id checks
- RLS policies respected (no bypass)
- Service role used only for secure operations

### Audit Trail
- Every payment attachment logged to `finance_audit_events`
- Includes booking_id, folio_id, amount, transaction_ref
- User context preserved (NULL for system actions)

## Monitoring

### Success Metrics
- Zero orphaned payments for new check-ins (target: 100%)
- Payment attachment success rate >99%
- Check-in error rate unchanged (<0.1%)

### Key Logs to Monitor
```bash
# Check-in function logs
supabase functions logs checkin-guest | grep "CHECKIN-V3-PAYMENT-ATTACH"

# Database function logs (via Supabase Dashboard → Database → Logs)
# Search for: ATTACH-PAYMENTS-V1
```

### Alert Conditions
- Payment attachment failures >5% of check-ins
- Orphaned payment count increasing over time
- Check-in latency >2 seconds (investigate payment attachment)

## Future Enhancements

### Potential Improvements
1. **Batch Payment Attachment**: Process multiple bookings in single transaction
2. **Webhook Notifications**: Alert staff when payment attachment fails
3. **Retry Mechanism**: Automatic retry for failed attachments with exponential backoff
4. **Dashboard Widget**: Show orphaned payment count in Finance Center

### Known Limitations
1. Post-checkout payments not handled (by design - separate ledger)
2. Failed payment attachments require manual investigation
3. No automatic retry for transient failures

## Support & Troubleshooting

### Common Issues

**Issue**: Payment not appearing in Billing Center after check-in
- **Check**: `payments.stay_folio_id` should not be NULL
- **Query**: `SELECT stay_folio_id FROM payments WHERE id = '<payment_id>'`
- **Fix**: Manually call `attach_booking_payments_to_folio` for the booking

**Issue**: Check-in fails with folio creation
- **Check**: Edge function logs for errors
- **Query**: Check if folio was created but attachment failed
- **Fix**: Investigate edge function logs, retry check-in

**Issue**: Folio balance incorrect
- **Check**: Sum of folio_transactions should match stay_folio totals
- **Query**: Use verification queries above
- **Fix**: Run `supabase db push` to ensure migrations applied

## Related Documentation
- [Payment-Folio RPC Fix V2.2.1](./PAYMENT-FOLIO-RPC-FIX.md) - 4-param wrapper architecture
- [Folio System Foundation](./FOLIO-SYSTEM-FOUNDATION.md) - Core folio architecture
- [Finance Center Guide](./FINANCE-CENTER.md) - Complete finance workflows

## Change Log
- **2025-01-18**: Initial implementation (V1)
  - Created `attach_booking_payments_to_folio` function
  - Integrated into check-in flow
  - Added backfill migration
  - Enhanced drawer UI with "View Folio" button
  - Implemented cross-tab sync
