# GROUP BILLING ENGINE FIX V1

**Status**: ✅ Backend Complete (Phases 1-3, 6) | 🔄 UI Testing Required (Phases 4-5, 7)

## Summary of Changes

This fix addresses the critical Group Billing Engine issues where:
- Group bookings showed ₦90,000 instead of ₦30,000 (triple-charging)
- Master folio was incorrectly linked to a specific room, preventing child folios
- Payments appeared to apply across multiple rooms incorrectly

## What Was Fixed

### Phase 1: Stop Charging at Booking Creation ✅
**File**: `supabase/functions/create-booking/index.ts`
- ❌ **Removed**: Lines 265-323 (charge posting block)
- ✅ **Now**: Group bookings only create master folio with `total_charges: 0`
- ✅ **Result**: No charges posted until check-in

### Phase 2: Fix Master Folio Architecture ✅
**Migration**: `GROUP-BILLING-FIX-V1` Phase 2
- ❌ **Old**: `create_group_master_folio(p_master_booking_id)`
- ✅ **New**: `create_group_master_folio()` - NO booking_id parameter
- ✅ **Result**: Master folio has `booking_id: NULL`, linked only via `metadata->>'group_id'`
- ✅ **Helper**: Created `sync_master_folio_totals(p_master_folio_id)` RPC

### Phase 3: Post Charges ONCE at Check-In ✅
**File**: `supabase/functions/checkin-guest/index.ts`
- ✅ **Added**: Charge posting via `folio_post_charge` RPC
- ✅ **Added**: Master folio sync via `sync_master_folio_totals` RPC
- ✅ **Result**: Charges posted once per room at check-in, aggregated to master

### Phase 6: Data Cleanup ✅
**Migration**: `GROUP-BILLING-FIX-V1` Phase 6
- ✅ **Reset**: WEDDING 2 master folio charges from ₦90,000 to ₦0
- ✅ **Deleted**: Incorrect charge transactions
- ✅ **Unlinked**: Master folio from booking `d2a081f6`

## Testing Checklist

### 1️⃣ Create New 3-Room Group Booking
```
Action: Create group booking with 3 rooms @ ₦10,000/night × 1 night
Expected:
✅ Master folio created with total_charges: 0
✅ Master folio has booking_id: NULL
✅ Group Billing Center loads (shows ₦0 balance)
✅ No charges posted yet
```

### 2️⃣ Check In Room 1
```
Action: Check in first room
Expected:
✅ Child folio created for Room 1
✅ ₦10,000 charge posted to child folio (via folio_transactions)
✅ Child folio linked to master (parent_folio_id set)
✅ Master folio synced: total_charges: ₦10,000, balance: ₦10,000
✅ Group Billing Center shows 1 child folio, ₦10,000 total
```

### 3️⃣ Check In Rooms 2 & 3
```
Action: Check in remaining rooms
Expected:
✅ Child folio created for each room
✅ ₦10,000 charge posted to each child folio
✅ Master folio synced after each: total_charges: ₦30,000, balance: ₦30,000
✅ Group Billing Center shows 3 child folios
✅ NO ₦90,000 or ₦100,000 mismatch
```

### 4️⃣ Collect Payment for Room 1
```
Action: Collect ₦10,000 payment for Room 1 only
Expected:
✅ Payment attached to Room 1 child folio ONLY
✅ Room 1 balance: ₦0
✅ Rooms 2 & 3 balance: ₦10,000 each
✅ Master folio: total_charges: ₦30,000, total_payments: ₦10,000, balance: ₦20,000
✅ Payment does NOT appear for other rooms
```

### 5️⃣ Verify WEDDING 2 Group (Existing Data)
```
Action: Navigate to Group Billing Center for WEDDING 2
Expected:
✅ Master folio shows: total_charges: ₦0 (reset)
✅ Can check in Room 104 now (master folio no longer blocking it)
✅ After check-in: Room 104 gets child folio
✅ Master folio updates with Room 104 charges
```

## Architecture Changes

### Before (BROKEN)
```
create-booking edge function
└─ Creates master folio linked to booking `d2a081f6`
└─ Posts ₦90,000 charges (3 rooms × ₦30,000)
└─ Room `d2a081f6` cannot get child folio (already has master)

checkin-guest edge function
└─ Creates child folios
└─ Does NOT post charges (assumes already posted)
└─ Result: No charges in folio_transactions
```

### After (FIXED)
```
create-booking edge function
└─ Creates master folio with booking_id: NULL
└─ NO charge posting
└─ Master folio: total_charges: 0

checkin-guest edge function
└─ Creates child folio
└─ Posts ₦10,000 charge via folio_post_charge RPC
└─ Links child to master via parent_folio_id
└─ Syncs master folio totals via sync_master_folio_totals RPC
└─ Result: Charges in folio_transactions, accurate balances
```

## Key Invariants

1. **One Child Folio per Room**: Each room in group gets exactly one child folio
2. **Single Source of Truth**: Charges posted ONCE at check-in, NOT at booking creation
3. **Master Folio Independence**: Master folio `booking_id: NULL`, linked only via `metadata->>'group_id'`
4. **Aggregation Not Duplication**: Master totals = SUM(child totals), not separate charges
5. **Payment Scoping**: Payments attach to specific child folios, not floating

## UI Architecture (GROUP-BILLING-UI-V1)

### Shared Formatting Utilities ✅
**Location**: `src/lib/folio/formatters.ts`
- `formatFolioMoney()` - Consistent currency formatting
- `isCredit()` - Detect negative balances (overpayments)
- `getCreditLabel()` - Format credit balances with "Credit: ₦X"
- `getBalanceColor()` - Consistent color coding (red=debt, green=credit)
- `getFolioStatusVariant()` - Badge styling

### Updated Components ✅

**GroupFolioSummaryCard**:
- Shows single "Outstanding Balance" (not separate Master Balance)
- Includes subtitle explaining aggregation
- Credit badges in breakdown rows
- Consistent formatting via shared utilities

**GroupChildFolioCard**:
- "Credit Folio" badge for overpayments (with tooltip)
- Consistent charges/payments/balance display
- Matches breakdown rows exactly

**RoomActionDrawer**:
- Enhanced folio section with charges/payments breakdown
- "View Group Billing" button for group rooms
- Credit balance handling
- Links to `/dashboard/group-billing/:groupId`

### UI Consistency Rules

1. **Same Folio = Same Numbers**: Child folio card and room drawer show identical values
2. **Same Formatting**: All currency uses `formatFolioMoney()`, colors use `getBalanceColor()`
3. **Credit Handling**: Negative balances labeled "Credit: ₦X" in green
4. **No Frontend Calculations**: All totals from `useGroupMasterFolio` hook

### Additional QA Scenarios

#### Scenario: Group with Overpayment (Credit)
```
Setup:
- Room 1: ₦50,000 charges, ₦80,000 payments = -₦30,000
- Room 2: ₦50,000 charges, ₦0 payments = ₦50,000
- Room 3: ₦50,000 charges, ₦50,000 payments = ₦0

Expected:
✅ Master: Charges ₦150,000, Payments ₦130,000, Balance ₦20,000
✅ Room 1 child card: Shows "Credit Folio" badge, balance "Credit: ₦30,000.00" in green
✅ Room 1 drawer: Matches child card exactly (charges/payments/balance)
✅ Breakdown: Room 1 shows green credit indicator
✅ No confusion about negative balances
```

#### Scenario: UI Consistency Cross-Check
```
Action: Open Group Billing Center + Room 1 Drawer simultaneously
Expected:
✅ Room 1 child card balance matches drawer balance exactly
✅ Room 1 charges match across both views
✅ Room 1 payments match across both views
✅ Formatting identical (currency symbol, decimals, colors)
```

## Remaining Work

### Phase 7: End-to-End Testing
- [ ] Complete full testing checklist above
- [ ] Test all new UI scenarios (credit balances, formatting consistency)
- [ ] Verify no regression in single-booking flows
- [ ] Document any edge cases discovered

## Version Markers

All changes marked with version identifiers:
- Backend: `GROUP-BILLING-FIX-V1-PHASE-{N}`
  - Phase 1: `GROUP-BILLING-FIX-V1-PHASE-1` (create-booking)
  - Phase 3: `GROUP-BILLING-FIX-V1-PHASE-3` (checkin-guest)
  - Migrations: `GROUP-BILLING-FIX-V1`
- UI: `GROUP-BILLING-UI-V1`
  - Formatters: `src/lib/folio/formatters.ts`
  - Components: GroupFolioSummaryCard, GroupChildFolioCard, RoomActionDrawer

## Edge Function Deployment Status

✅ Both edge functions auto-deploy with code changes
- `create-booking`: Charge posting removed
- `checkin-guest`: Charge posting + master sync added

---

## Related Documentation

- [Group Billing UI Architecture](./GROUP_BILLING_UI_ARCHITECTURE.md) - Complete UI architecture and data flow
- [Billing Center QA Checklist](./BILLING_CENTER_QA_CHECKLIST.md) - Testing procedures

---

**Last Updated**: 2025-11-21
**Status**: Backend Complete ✅ | UI Complete ✅ | Ready for End-to-End Testing
