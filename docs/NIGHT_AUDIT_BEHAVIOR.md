# Night Audit Behavior Documentation

**Date:** 2025-11-20  
**Status:** ✅ VERIFIED CLEAN  
**Conclusion:** Night Audit does NOT violate manual-only PMS principle

---

## Overview

This document confirms that the Night Audit system is **NOT** a source of auto-checkout behavior.

---

## Night Audit Scope

### File
`supabase/functions/night-audit-run/index.ts`

### What Night Audit DOES

1. **Calculate Revenue Statistics**
   - Total room revenue for the audit day
   - Revenue by rate type
   - Occupancy calculations

2. **Count Folio Types**
   - Calls `calculate_folio_stats_by_type` RPC
   - Groups folios by type (room, master, etc.)

3. **Aggregate Payment Totals**
   - Sums payments received during audit period
   - Groups by payment method
   - Tracks cash vs card vs transfer

4. **Create Audit Report**
   - Inserts record into `night_audit_runs` table
   - Stores calculated statistics
   - Generates timestamp and audit summary

### What Night Audit DOES NOT DO

- ❌ **Does NOT update `bookings.status`**
- ❌ **Does NOT update `rooms.status`**
- ❌ **Does NOT update `stay_folios.status`**
- ❌ **Does NOT auto-checkout guests**
- ❌ **Does NOT auto-release rooms**
- ❌ **Does NOT close folios**

---

## Night Audit Functions Analyzed

### 1. `night-audit-run` Edge Function
**Purpose:** End-of-day revenue reporting  
**Mutations:** NONE - Pure read-only analysis  
**Tables Modified:** Only `night_audit_runs` (reporting table)

### 2. `calculate_folio_stats_by_type` Database Function
**Purpose:** Aggregate folio statistics by type  
**Mutations:** NONE - Pure read-only query  
**Returns:** JSONB summary of folio counts and revenue

### 3. `prepare_folio_for_night_audit` Database Function
**Purpose:** Create snapshot of folio state for audit  
**Mutations:** Updates `stay_folios` with snapshot metadata  
**Does NOT:** Change folio status or close folios

### 4. `complete_night_audit_for_folio` Database Function
**Purpose:** Mark folio as audited  
**Mutations:** Updates `night_audit_status` field only  
**Does NOT:** Close folios or change booking/room status

---

## Manual-Only PMS Principle Compliance

**Verdict:** ✅ **FULLY COMPLIANT**

Night Audit respects the manual-only principle by:
1. Operating as pure reporting/analytics layer
2. Never modifying operational state (bookings, rooms, folios)
3. Only updating audit-specific metadata fields
4. Requiring explicit staff actions for all state transitions

---

## Night Audit Database Fields

The system includes night audit preparation fields in `stay_folios`:

```sql
-- Fields for night audit tracking
night_audit_day DATE
posting_date DATE
is_closed_for_day BOOLEAN
folio_snapshot JSONB
night_audit_status TEXT
```

**Purpose:** These fields track audit progress and create point-in-time snapshots.

**Important:** These fields are for **tracking only**. They do NOT trigger automatic checkout or room release.

---

## Audit Trail Integration

Night Audit integrates with finance audit events:

```typescript
INSERT INTO finance_audit_events (
  event_type: 'night_audit_completed',
  payload: {
    audit_day: auditDay,
    total_revenue: revenue,
    folios_audited: folioCount
  }
)
```

**No State Mutations:** Audit events are for reporting only.

---

## Conclusion

Night Audit is **NOT** responsible for:
- Rooms becoming 'available' at midnight
- Bookings auto-completing
- Any auto-checkout behavior

The actual root causes were:
1. Frontend defensive logic in `roomAvailability.ts` (FIXED)
2. Database auto-sync trigger `sync_room_status_with_bookings()` (FIXED)

Night Audit can continue operating safely without modifications.

---

## Related Documentation

- `docs/BOOKING_ROOM_INTEGRITY_AUDIT.md` - Complete root cause analysis
- `docs/GROUP_MASTER_FOLIO_AUDIT.md` - Group booking system architecture
- `supabase/diagnostics/booking_room_integrity.sql` - Diagnostic queries
