# Operations Hours & Lifecycle Testing Guide

## Phase 7: Comprehensive Testing Checklist

### Prerequisites
- [ ] Navigate to Front Desk dashboard
- [ ] Ensure operations hours configured: Check-In Time: 14:00, Check-Out Time: 12:00
- [ ] Have test bookings for different scenarios

---

## Test Scenario 1: Future Reservation
**Setup**: Create booking for tomorrow

**Expected Results**:
- [ ] Room tile shows **Reserved** badge (blue/reserved color)
- [ ] Room status in grid: `reserved`
- [ ] Open drawer → Shows booking details
- [ ] Quick Actions visible:
  - [ ] "View Reservation"
  - [ ] "Booking Confirmation"
  - [ ] "Cancel Reservation"
- [ ] No status alert shown
- [ ] No "Check-In Guest" button (arrival not today)

**Lifecycle State**: `reserved-future`

---

## Test Scenario 2: Arriving Today (Before Check-In Time)
**Setup**: Booking with check-in TODAY, current time < 14:00

**Expected Results**:
- [ ] Room tile shows **Reserved** badge
- [ ] Room status: `reserved`
- [ ] Open drawer → Shows booking details
- [ ] No status alert shown
- [ ] Quick Actions visible:
  - [ ] "View Reservation"
  - [ ] "Cancel Reservation"
- [ ] "Check-In Guest" button **DISABLED or NOT SHOWN** (before check-in time)
- [ ] Status message: "Check-in from 14:00"

**Lifecycle State**: `expected-arrival-today`

---

## Test Scenario 3: Arriving Today (After Check-In Time)
**Setup**: Booking with check-in TODAY, current time >= 14:00

**Expected Results**:
- [ ] Room tile shows **Reserved** badge
- [ ] Room status: `reserved`
- [ ] Open drawer → Shows booking details
- [ ] No status alert shown
- [ ] Quick Actions visible:
  - [ ] **"Check-In Guest"** (primary action)
  - [ ] "View Reservation"
  - [ ] "Cancel Reservation"
- [ ] Status message: "Ready to check in"

**Lifecycle State**: `expected-arrival-today`

---

## Test Scenario 4: In-House Guest (Normal Stay)
**Setup**: Guest checked in yesterday, departing tomorrow

**Expected Results**:
- [ ] Room tile shows **Occupied** badge (green/occupied color)
- [ ] Room status: `occupied`
- [ ] Open drawer → Shows guest details and folio balance
- [ ] No status alert shown
- [ ] Quick Actions visible:
  - [ ] "Check-Out"
  - [ ] "Extend Stay"
  - [ ] "Transfer Room"
  - [ ] "Add Service"
  - [ ] "Post Payment"
  - [ ] "Do Not Disturb"
- [ ] Status message: "Departing YYYY-MM-DD"

**Lifecycle State**: `in-house`

---

## Test Scenario 5: **CRITICAL** - Departing Today (Before Checkout Time)
**Setup**: Guest checked in yesterday, checkout TODAY, current time < 12:00

**Expected Results**:
- [ ] Room tile shows **Departing Today** badge (ORANGE)
- [ ] Room status: `departing-today`
- [ ] Open drawer → Shows guest details and folio balance
- [ ] **ORANGE ALERT** displayed:
  - [ ] Message: "Due Out Today — Checkout time: 12:00"
  - [ ] Clock icon visible
- [ ] Quick Actions visible:
  - [ ] "Check-Out" (primary action)
  - [ ] "Extend Stay"
  - [ ] "Transfer Room"
  - [ ] "Add Service"
  - [ ] "Post Payment"
  - [ ] "Do Not Disturb"
- [ ] Drawer does NOT show "No active booking"
- [ ] Status message: "Due out at 12:00"

**Lifecycle State**: `departing-today`

---

## Test Scenario 6: **CRITICAL** - Overstay (After Checkout Time)
**Setup**: Guest checked in yesterday, checkout TODAY, current time >= 12:00, NOT checked out

**Expected Results**:
- [ ] Room tile shows **Overstay** badge (RED)
- [ ] Room status: `overstay`
- [ ] Open drawer → Shows guest details and folio balance
- [ ] **RED ALERT** displayed:
  - [ ] Message: "Overstay Alert — Guest was due out at 12:00"
  - [ ] Alert triangle icon visible
- [ ] Quick Actions visible:
  - [ ] "Extend Stay" (primary action to resolve)
  - [ ] "Apply Overstay Charge"
  - [ ] "Check-Out" (destructive variant)
  - [ ] "Transfer Room"
  - [ ] "Post Payment"
- [ ] Drawer does NOT show "No active booking"
- [ ] Status message: "Due out YYYY-MM-DD"

**Lifecycle State**: `overstay`

---

## Test Scenario 7: Back-to-Back Bookings (Same Room)
**Setup**: 
- Stay A: Check-in yesterday, checkout TODAY
- Stay B: Check-in TODAY, checkout tomorrow

### Part A: Before Stay A Checkout (Morning)
**Expected Results**:
- [ ] Room belongs to Stay A
- [ ] Room status: `departing-today` (if before 12:00) or `overstay` (if after 12:00)
- [ ] Open drawer → Shows Stay A details
- [ ] Stay B NOT visible as active booking
- [ ] Cannot check in Stay B yet

### Part B: After Stay A Checkout
**Expected Results**:
- [ ] Room status changes to `cleaning`
- [ ] Open drawer → Shows "Mark Clean" action
- [ ] After marking clean, room becomes `available`
- [ ] Stay B now appears as "expected-arrival-today"
- [ ] Can check in Stay B if time >= 14:00

---

## Verification Tests

### Test V1: Operations Hours Integration
- [ ] Navigate to Configuration Center → Operations Hours
- [ ] Change Check-Out Time from 12:00 to 11:00
- [ ] Create test booking: checkout today, current time 11:30
- [ ] Room status should be `overstay` (past new 11:00 checkout)
- [ ] Overstay alert shows "due out at 11:00"
- [ ] Change back to 12:00
- [ ] Same room now shows `departing-today` (before 12:00)

**Result**: ✅ Confirms dynamic operations hours integration

---

### Test V2: No Active Booking Error (Fixed)
**Setup**: Room with checkout-today booking

**Before Fix**:
- Drawer showed "No active booking for this room"
- Quick actions empty

**After Fix**:
- [ ] Drawer shows correct booking details
- [ ] Guest name, folio balance visible
- [ ] Quick actions populated based on lifecycle
- [ ] Status alert shown correctly

**Result**: ✅ Confirms booking resolution fix (line 123: `>=` instead of `>`)

---

### Test V3: Lifecycle State Accuracy
**Test Each State**:

1. [ ] `vacant` → Room available, no booking
2. [ ] `reserved-future` → Future reservation
3. [ ] `expected-arrival-today` → Arriving today
4. [ ] `in-house` → Normal occupancy
5. [ ] `departing-today` → Checkout today before time
6. [ ] `overstay` → Past checkout time
7. [ ] `post-stay` → Already checked out

**Verification**: Open browser console, check logs for lifecycle calculation

---

### Test V4: Conditional Actions Logic
**For each lifecycle state, verify actions match allowedActions array**:

- [ ] `vacant`: Assign Room, Walk-in Check-In, Set Out of Service
- [ ] `reserved-future`: View Reservation, Cancel
- [ ] `expected-arrival-today` (before check-in): View, Cancel
- [ ] `expected-arrival-today` (after check-in): **Check-In Guest**, View, Cancel
- [ ] `in-house`: Checkout, Extend, Transfer, Add Service, Post Payment, DND
- [ ] `departing-today`: Same as in-house + orange alert
- [ ] `overstay`: Extend (primary), Apply Charge, Checkout (destructive), Transfer
- [ ] `cleaning`: Mark Clean
- [ ] `maintenance`: Mark as Available

---

### Test V5: Visual Elements
- [ ] Departing Today badge is **ORANGE** (not red, not green)
- [ ] Overstay badge is **RED**
- [ ] Orange alert has **Clock icon**
- [ ] Red alert has **Alert Triangle icon**
- [ ] Badge text is "Departing Today" (not "departing-today" with hyphen)

---

### Test V6: Real-Time Updates
**Setup**: Open drawer for departing-today room (11:55 AM)

**Test**:
1. [ ] Status shows "Departing Today" with orange alert
2. Wait until 12:00 PM (or change system time)
3. [ ] Status automatically changes to "Overstay" with red alert
4. [ ] Actions update (Checkout becomes destructive variant)

**Result**: ✅ Confirms real-time status calculation

---

### Test V7: No Auto-Checkout Verification
**Setup**: Room with checkout yesterday

**At Midnight (00:00)**:
- [ ] Room status: `overstay`
- [ ] Room status does NOT automatically change to `available`
- [ ] Room status does NOT automatically change to `cleaning`
- [ ] Booking status remains `checked_in`
- [ ] Guest NOT automatically checked out

**Manual Checkout Required**:
- [ ] Staff must click "Check-Out" button
- [ ] Only then does status change to `cleaning`

**Result**: ✅ Confirms manual-only PMS principle preserved

---

## Browser Console Verification

### Expected Console Logs
```
RoomActionDrawer - Booking Resolution Debug: {
  roomId: "xxx",
  roomNumber: "101",
  roomStatus: "occupied",
  bookingsCount: 1,
  contextDate: null
}

DRAWER-LIFECYCLE-INTEGRATION-V1: {
  state: "departing-today",
  displayStatus: "departing-today",
  allowedActions: ["checkout", "collect-payment", "add-charge", ...]
}
```

### No Error Logs Expected
- [ ] No TypeScript errors
- [ ] No "Cannot read properties of null" errors
- [ ] No "Invalid date" warnings
- [ ] No RLS policy violations

---

## Performance Checks

- [ ] Room grid loads in < 2 seconds (100 rooms)
- [ ] Drawer opens instantly (< 300ms)
- [ ] Status calculations don't block UI
- [ ] No memory leaks from lifecycle calculations

---

## Edge Cases

### Edge Case 1: Midnight Transition
**Setup**: Room departing today at 23:59

**Test**:
- [ ] Status: `departing-today`
- At 00:00 (next day):
- [ ] Status changes to `overstay`
- [ ] Alert updates to show previous day checkout

### Edge Case 2: Multi-Night Overstay
**Setup**: Guest checked in 5 days ago, checkout 3 days ago

**Expected**:
- [ ] Status: `overstay`
- [ ] Status message: "Due out YYYY-MM-DD" (3 days ago)
- [ ] Actions include "Extend Stay" and "Apply Overstay Charge"

### Edge Case 3: Same-Day Booking
**Setup**: Check-in today, checkout today

**Expected**:
- [ ] Before check-in time: `reserved`
- [ ] After check-in, before checkout: `in-house` (not departing-today)
- [ ] After checkout time: `overstay` if not checked out

### Edge Case 4: Manual Room Status Override
**Setup**: Occupied room, set to "Maintenance"

**Expected**:
- [ ] Status: `maintenance`
- [ ] Lifecycle respects manual override
- [ ] Actions: "Mark as Available"
- [ ] Booking data still preserved

---

## Regression Tests

### Must Not Break
- [ ] Check-in flow still works
- [ ] Checkout flow still works
- [ ] Quick Payment posting works
- [ ] Add Charge modal works
- [ ] Extend Stay works
- [ ] Transfer Room works
- [ ] Group bookings still display correctly
- [ ] Organization wallet warnings still show
- [ ] Folio balances calculate correctly

---

## Sign-Off Criteria

### All Must Pass ✅
- [ ] All 7 test scenarios pass
- [ ] All verification tests pass
- [ ] All edge cases handled correctly
- [ ] Zero console errors
- [ ] No TypeScript compilation errors
- [ ] Performance benchmarks met
- [ ] Manual-only PMS principle preserved
- [ ] Operations hours integration confirmed
- [ ] No regressions in existing features

### Documentation Updated
- [ ] User guide updated with new status meanings
- [ ] Staff training materials prepared
- [ ] Screenshot guide showing orange "Departing Today" badge
- [ ] Screenshot guide showing red "Overstay" alert

---

## Known Limitations

1. **Time Zone**: Uses browser local time, not hotel time zone (future enhancement)
2. **Grace Period**: No configurable overstay grace period yet
3. **Automated Charges**: Overstay charges must be applied manually
4. **Housekeeping Integration**: Room cleaning status not automatically linked to lifecycle

---

## Rollback Plan

If critical issues found:
1. Revert `src/lib/stayLifecycle.ts` changes
2. Restore original booking resolution logic (line 123: `>` instead of `>=`)
3. Remove lifecycle imports from RoomActionDrawer, RoomGrid
4. Redeploy previous stable version

---

**Testing Status**: READY FOR QA
**Last Updated**: 2025-11-21
