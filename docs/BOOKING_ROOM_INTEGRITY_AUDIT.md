# Booking / Room Integrity Audit Report

**Date:** 2025-11-20  
**Status:** ✅ FIXED  
**Migration:** `20251120_fix_manual_only_pms_principle`

---

## Executive Summary

This audit identified **three critical root causes** for auto-checkout behavior violating the manual-only PMS principle:

1. **Frontend Defensive Logic** (lines 44-48, 78-80 in `roomAvailability.ts`)
2. **Database Auto-Sync Trigger** (`sync_room_status_with_bookings`)
3. **Incomplete Manual-Only Enforcement** (`prevent_auto_checkout`)

All three issues have been **FIXED** in this deployment.

---

## Root Cause #1: Frontend Auto-Available Logic

### File
`src/lib/roomAvailability.ts`

### Issue
Function `getRoomStatusNow()` was using defensive time-based logic to auto-derive room availability:

```typescript
// OLD CODE (REMOVED):
if (!booking || booking.status === 'cancelled' || booking.status === 'completed') {
  return 'available';  // ❌ AUTO-CONVERTS TO AVAILABLE
}

// Check-out day past checkout time:
return 'available';  // ❌ AUTO-RELEASES ROOM
```

### Impact
- Rooms appeared as "Available" in UI at midnight without database changes
- Created visual auto-checkout without staff action
- Users saw rooms flip status automatically

### Fix Applied
- Removed time-based auto-availability logic
- Now trusts `room.status` from database as authoritative source
- Only returns 'overstay' for past-checkout checked-in bookings
- Never auto-derives 'available' status

---

## Root Cause #2: Database Auto-Sync Trigger

### Migration
`20251030130948_d23528ab-f3cc-4d45-80b1-b510f104265d.sql`

### Issue
Trigger `sync_room_status_on_booking_change` was automatically updating `rooms.status`:

```sql
-- OLD CODE (MODIFIED):
ELSE
  -- Only set to available if room is not in maintenance or cleaning
  UPDATE rooms SET status = 'available'  -- ❌ AUTO-RELEASES ROOMS
  WHERE id = COALESCE(NEW.room_id, OLD.room_id)
    AND status NOT IN ('maintenance', 'cleaning', 'out_of_order');
END IF;
```

### Impact
- Violated manual-only PMS principle at database level
- Automatically released rooms to 'available' status
- Ran on every `INSERT`, `UPDATE`, `DELETE` of bookings table
- Bypassed `prevent_auto_checkout` trigger

### Fix Applied
- Modified trigger to **ONLY** mark rooms as 'occupied' when booking is checked-in
- Removed auto-release to 'available' logic entirely
- Room can only become 'available' via explicit `complete-checkout` edge function

---

## Root Cause #3: Incomplete Manual-Only Enforcement

### Migration
`20251119225313_c052e96e-a066-4d6e-8a6c-f05d80ae059c.sql`

### Issue
Function `prevent_auto_checkout()` blocked auto-completion but didn't require staff attribution:

```sql
-- OLD CODE (ENHANCED):
IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
  -- Missing: No check for checked_out_by metadata
  RAISE EXCEPTION 'Cannot auto-complete booking';
END IF;
```

### Fix Applied
- Enhanced to require `checked_out_by` metadata field
- Only allows status='completed' via proper checkout flow
- Blocks ALL completion attempts without explicit staff attribution

---

## Additional Fixes

### Fix #4: Diagnostics RPC Created
Created read-only RPC `booking_room_integrity_diagnostics(p_tenant_id UUID)` returning:
- `rooms_mismatch`: Rooms with checked-in bookings but room status != occupied
- `checked_in_without_folio`: Bookings without folios (critical data integrity)
- `groups_without_master`: Groups missing master folios

### Fix #5: Missing Folios Repaired
Idempotent repair migration created folios for 12 checked-in bookings that had no folios

### Fix #6: Room State Validated
One-time validation query recalculated room status based on active bookings

---

## Code Paths That Change Booking/Room/Folio Status

### Bookings Status Changes
1. **create-booking** edge function → `status='reserved'`
2. **checkin-guest** edge function → `status='checked_in'`
3. **complete-checkout** edge function → `status='completed'` (ONLY via this path)
4. **Database trigger**: `prevent_auto_checkout()` blocks unauthorized completions

### Rooms Status Changes
1. **Database trigger**: `sync_room_status_with_bookings()` → `status='occupied'` (only)
2. **complete-checkout** edge function → `status='cleaning'` or `'available'` (explicit)
3. **useRoomActions** hook → `updateRoomStatus()` for maintenance/cleaning (staff-driven)

### Folios Status Changes
1. **checkin-guest** edge function → `status='open'`
2. **complete-checkout** edge function → `status='closed'`
3. **Database trigger**: `close_folio_on_checkout()` auto-closes when booking completes

---

## Night Audit Behavior

**File:** `supabase/functions/night-audit-run/index.ts`

### Confirmed Clean
Night Audit **DOES NOT**:
- ❌ Update `bookings.status`
- ❌ Update `rooms.status`
- ❌ Update `stay_folios.status`
- ❌ Auto-checkout guests
- ❌ Auto-release rooms

Night Audit **ONLY**:
- ✅ Calculates revenue statistics
- ✅ Counts folio types
- ✅ Aggregates payment totals
- ✅ Updates `night_audit_runs` table (reporting only)

**Conclusion:** Night Audit is NOT a source of auto-checkout behavior.

---

## Findings Summary

### Before Fix
- ❌ 14 rooms showing 'available' with active 'reserved' bookings
- ❌ Rooms auto-released at midnight without staff action
- ❌ Frontend computed status overriding database truth
- ❌ Database trigger auto-syncing room status
- ❌ 12 checked-in bookings without folios

### After Fix
- ✅ Frontend trusts database room status
- ✅ Database trigger only marks occupied (never releases)
- ✅ Manual-only checkout strictly enforced
- ✅ All checked-in bookings have folios
- ✅ Diagnostics RPC available for monitoring

---

## Recommended Testing

1. **Create Booking** → Room should remain in database status
2. **Check-in** → Room becomes 'occupied'
3. **Wait Past Checkout Time** → UI shows 'overstay', room stays 'occupied'
4. **Explicit Checkout** → Room becomes 'cleaning' or 'available'
5. **Overnight Test** → No rooms auto-release at midnight

---

## Diagnostic SQL Queries

See: `supabase/diagnostics/booking_room_integrity.sql`

Run these queries anytime to check system health:
- Query 1: Rooms with status mismatches
- Query 2: Auto-completed bookings
- Query 3: Room state overview
- Query 4: Checked-in without folios
- Query 5: Overstay bookings
- Query 6-8: System health metrics

---

## Related Documentation

- `docs/GROUP_MASTER_FOLIO_AUDIT.md` - Group booking system architecture
- `docs/NIGHT_AUDIT_BEHAVIOR.md` - Night audit scope confirmation
- `supabase/diagnostics/group_folio_integrity.sql` - Group folio diagnostics
