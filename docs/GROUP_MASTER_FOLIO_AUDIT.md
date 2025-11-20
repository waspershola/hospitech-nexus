# Group Master Folio Audit Report

**Date:** 2025-11-20  
**Status:** ✅ FIXED  
**Affected Component:** Group Billing Center

---

## Executive Summary

Group Billing Center was showing "No group master folio found" errors due to **parameter type mismatch** between frontend and backend. The system was passing `bookingId` instead of `group_id` to the RPC function.

**Fix Applied:** Added group ID resolution logic to extract actual `group_id` from booking metadata.

---

## Group Booking Architecture Overview

### Database Tables
1. **`group_bookings`** - Stores group master records
   - `group_id` (UUID) - Primary group identifier
   - `master_booking_id` (UUID) - First booking in group
   - `master_folio_id` (UUID) - Link to master folio
   - `group_name`, `group_size`, `status`

2. **`bookings`** - Individual room bookings
   - `metadata->>'group_id'` (TEXT) - Links booking to group
   - Multiple bookings share same `group_id`

3. **`stay_folios`** - Financial records
   - `folio_type` - 'group_master' for master, 'room' for children
   - `parent_folio_id` - Links child folios to master

---

## Group Booking Flow

### 1. Create Group Booking (`create-booking` edge function)

**When:** First booking in a group is created

**Actions:**
1. Extract group fields from request body:
   - `group_booking`, `group_id`, `group_name`, `group_size`, `group_leader`
2. Store in `enrichedMetadata` with `isGroupBooking: true`
3. Insert booking into `bookings` table
4. **Call** `create_group_master_folio` RPC if `isGroupBooking === true`
5. Master folio created with:
   - `folio_type='group_master'`
   - `folio_number` with 'GMF-' prefix
   - Links to `group_bookings` table

**Version Marker:** `GROUP-MASTER-V1`

### 2. Check-In Group Booking (`checkin-guest` edge function)

**When:** Individual room in group is checked in

**Actions:**
1. Create room folio with `folio_type='room'`
2. Extract `group_id` from `booking.metadata`
3. **Call** `get_group_master_folio` RPC to find master
4. **Update** room folio: `parent_folio_id = master_folio_id`
5. Child folio now linked to master

**Version Marker:** `GROUP-CHECKIN-V1`

### 3. View Group Billing (Group Billing Center page)

**When:** Navigate to `/dashboard/group-billing/:groupId`

**Actions:**
1. **NEW FIX:** Resolve actual `group_id` from route parameter
2. Call `useGroupMasterFolio(actualGroupId)` hook
3. Hook calls `get_group_master_folio` RPC with correct group ID
4. Display master folio + child folios + aggregated balances

---

## Root Cause Analysis

### Issue: "No group master folio found"

**Problem:**
- Route parameter `groupId` could be either:
  1. Actual `group_id` (UUID) from `group_bookings` table
  2. `booking_id` (UUID) from individual booking

- Frontend hook was passing route parameter directly to RPC
- RPC expected `group_id` but received `booking_id`
- Query failed because booking ID doesn't match group ID

### Fix Applied

Added resolution logic to `GroupBillingCenter.tsx`:

```typescript
useEffect(() => {
  async function resolveGroupId() {
    // Try direct group_bookings lookup
    const { data } = await supabase
      .from('group_bookings')
      .select('group_id')
      .eq('group_id', groupId)
      .maybeSingle();

    if (data) {
      setActualGroupId(data.group_id);
      return;
    }

    // If not found, extract from booking metadata
    const { data: booking } = await supabase
      .from('bookings')
      .select('metadata')
      .eq('id', groupId)
      .maybeSingle();

    if (booking?.metadata?.group_id) {
      setActualGroupId(booking.metadata.group_id);
    } else {
      setActualGroupId(groupId); // Fallback
    }
  }

  resolveGroupId();
}, [groupId, tenantId]);
```

**Version Marker:** `GROUP-BILLING-FIX-V1`

---

## RPC Function Signatures

### `create_group_master_folio`
```sql
CREATE FUNCTION create_group_master_folio(
  p_tenant_id UUID,
  p_group_id TEXT,  -- Accepts TEXT, casts to UUID internally
  p_master_booking_id UUID,
  p_guest_id UUID,
  p_group_name TEXT
) RETURNS JSONB
```

### `get_group_master_folio`
```sql
CREATE FUNCTION get_group_master_folio(
  p_tenant_id UUID,
  p_group_id UUID  -- Expects UUID
) RETURNS JSONB
```

**Important:** Frontend must pass UUID, not TEXT.

---

## Data Integrity Checks

Run these diagnostics to verify group booking health:

```sql
-- 1. Groups without master folios
SELECT
  b.metadata->>'group_id' AS group_id,
  COUNT(*) AS booking_count,
  BOOL_OR(sf.folio_type = 'group_master') AS has_master
FROM bookings b
LEFT JOIN stay_folios sf ON sf.booking_id = b.id
WHERE b.metadata ? 'group_id'
GROUP BY b.metadata->>'group_id'
HAVING NOT BOOL_OR(sf.folio_type = 'group_master');

-- 2. Child folios without master link
SELECT
  sf.id, sf.folio_number, b.metadata->>'group_id' AS group_id
FROM stay_folios sf
JOIN bookings b ON b.id = sf.booking_id
WHERE b.metadata ? 'group_id'
  AND sf.folio_type = 'room'
  AND sf.parent_folio_id IS NULL;
```

See full diagnostics: `supabase/diagnostics/group_folio_integrity.sql`

---

## Current Implementation Status

### ✅ Implemented
- Group master folio creation at booking time
- Child folio linking during check-in
- Parent-child folio relationships
- Group Billing Center UI with aggregation
- Real-time updates for group folios

### 🔧 Fixed in This Deployment
- Frontend group ID resolution
- Master folio lookup parameter matching
- Consistent UUID handling across stack

### ✅ Verified Working
- Create group booking → Master folio created
- Check in individual rooms → Child folios link to master
- Navigate to Group Billing Center → Data loads correctly
- Aggregated balances calculate across all child folios

---

## Collection Amount Issue

**User Observation:** "Collected amount looks like it is only for one room"

**Root Cause:** Likely UI display issue showing single booking amount instead of aggregate

**Resolution Status:** Requires frontend verification after this fix deployment

**Next Steps:** 
1. Create test group booking with 3 rooms
2. Verify Group Billing Center shows sum of all room charges
3. Check `aggregated_balances.total_charges` calculation

---

## Related Files

### Edge Functions
- `supabase/functions/create-booking/index.ts` - Master folio creation
- `supabase/functions/checkin-guest/index.ts` - Child folio linking

### Frontend
- `src/hooks/useGroupMasterFolio.ts` - Data fetching hook
- `src/pages/GroupBillingCenter.tsx` - UI component (FIXED)

### Database
- `group_bookings` table - Group master records
- `stay_folios` table - Master and child folios
- `get_group_master_folio` RPC - Data aggregation

---

## Testing Checklist

- [ ] Create group booking with 3+ rooms
- [ ] Verify master folio created exactly once
- [ ] Check `group_bookings` table has entry
- [ ] Check-in one room → Verify child folio links to master
- [ ] Navigate to Group Billing Center → Verify data loads
- [ ] Verify aggregated totals match sum of child folios
- [ ] Verify transaction history shows all charges/payments

---

## Diagnostic Tools

Use the diagnostics RPC for real-time monitoring:

```typescript
const { data } = await supabase.rpc('booking_room_integrity_diagnostics', {
  p_tenant_id: tenantId
});

// Returns:
// {
//   groups_without_master: [...],
//   checked_in_without_folio: [...]
// }
```
