# Phase 5: End-to-End Testing Checklist
## Room Status & By Date View Synchronization Testing

**Version:** PHASE-5-TESTING-V1  
**Purpose:** Comprehensive testing checklist to verify Room Status and By Date views display consistent booking information across all components (RoomGrid, RoomTile, RoomActionDrawer).

---

## Pre-Test Setup

### Operations Hours Configuration
- [ ] Verify Check-In Time configured (default: 14:00)
- [ ] Verify Check-Out Time configured (default: 12:00)
- [ ] Note current operations hours for test scenarios: ___________

### Test Data Requirements
- [ ] At least 5 rooms with different states:
  - 1 vacant room (no bookings)
  - 1 reserved room (future arrival)
  - 1 arriving today (check-in = today, status = reserved)
  - 1 occupied room (checked-in guest)
  - 1 departing today (check-out = today, status = checked-in)
  - 1 overstay room (check-out < today, status = checked-in)
  - 1 cleaning/maintenance room

---

## Test Scenarios

### Scenario 1: Vacant Room (No Bookings)
**Test Room:** _____________

#### Room Status View (Today)
- [ ] RoomTile shows status badge: "Available" (green)
- [ ] RoomGrid displays room with status: "available"
- [ ] Click room → RoomActionDrawer opens
- [ ] Drawer header shows: Room number + "Available"
- [ ] Drawer Quick Actions show:
  - [ ] "Assign Room" button (default variant)
  - [ ] "Walk-in Check-In" button (outline variant)
  - [ ] "Set Out of Service" button (outline variant)
- [ ] No booking details displayed
- [ ] No lifecycle alerts shown

#### By Date View (Tomorrow)
- [ ] Navigate to By Date, select tomorrow's date
- [ ] Room shows "Available" status
- [ ] Click room → Drawer shows same "Available" state
- [ ] Quick Actions same as Room Status view

---

### Scenario 2: Reserved Room (Future Arrival)
**Test Room:** _____________  
**Arrival Date:** _____________ (future, not today)

#### Room Status View (Today)
- [ ] RoomTile shows status badge: "Available" (green)
- [ ] Room does NOT show booking details for future reservation
- [ ] Click room → Drawer shows "Available" state
- [ ] Quick Actions: Assign Room, Walk-in, Set Out of Service
- [ ] Console log: `overlappingCount: 0` (future booking excluded from today's view)

#### By Date View (Arrival Date)
- [ ] Navigate to By Date, select the arrival date
- [ ] RoomTile shows status badge: "Reserved" (blue)
- [ ] Room displays guest name and booking details
- [ ] Click room → Drawer shows booking details
- [ ] Quick Actions show:
  - [ ] "View Reservation" button
  - [ ] "Booking Confirmation" button
  - [ ] "Cancel Reservation" button (destructive)
- [ ] Console log: `overlappingCount: 1`, `selectedBookingId: [booking-id]`

---

### Scenario 3: Arriving Today (Before Check-In Time)
**Test Room:** _____________  
**Current Time:** _____________ (before check-in time)

#### Room Status View (Today)
- [ ] RoomTile shows status badge: "Reserved" (blue)
- [ ] Room displays guest name and arrival time
- [ ] Click room → Drawer opens with booking details
- [ ] Drawer lifecycle state: "expected-arrival-today"
- [ ] Status message: "Check-in from [check-in time]"
- [ ] Quick Actions show:
  - [ ] "View Reservation" button (check-in disabled until time)
  - [ ] "Cancel Reservation" button
- [ ] Console log: `lifecycleState: "expected-arrival-today"`

#### After Check-In Time
- [ ] Wait until after configured check-in time OR manually change system time
- [ ] RoomTile still shows "Reserved" badge
- [ ] Click room → Drawer shows updated Quick Actions:
  - [ ] "Check-In Guest" button (NOW ENABLED, default variant)
  - [ ] "View Reservation" button
  - [ ] "Cancel Reservation" button
- [ ] Status message changes to: "Ready to check in"

---

### Scenario 4: Occupied Room (In-House Guest)
**Test Room:** _____________  
**Departure Date:** _____________ (future, not today)

#### Room Status View (Today)
- [ ] RoomTile shows status badge: "Occupied" (red)
- [ ] Room displays guest name, check-in date, departure date
- [ ] Click room → Drawer opens with full booking details
- [ ] Drawer lifecycle state: "in-house"
- [ ] Status message: "Departing [departure-date]"
- [ ] Quick Actions show:
  - [ ] "Check-Out" button (default variant)
  - [ ] "Extend Stay" button (outline)
  - [ ] "Transfer Room" button (outline)
  - [ ] "Add Service" button (outline)
  - [ ] "Post Payment" button (outline)
  - [ ] "View Reservation" button (outline)
  - [ ] "Do Not Disturb" toggle (ghost variant)
- [ ] No lifecycle alerts shown (not departing today)
- [ ] Console log: `lifecycleState: "in-house"`, `displayStatus: "occupied"`

---

### Scenario 5: Departing Today (Before Check-Out Time)
**Test Room:** _____________  
**Current Time:** _____________ (before check-out time)

#### Room Status View (Today)
- [ ] RoomTile shows status badge: "Departing Today" (orange)
- [ ] Room displays guest name with orange departure indicator
- [ ] Click room → Drawer opens
- [ ] Drawer lifecycle state: "departing-today"
- [ ] Orange alert card displayed: "Due Out Today — Checkout time: [check-out time]"
- [ ] Status message: "Due out at [check-out time]"
- [ ] Quick Actions show:
  - [ ] "Check-Out" button (default variant)
  - [ ] "Extend Stay" button
  - [ ] "Transfer Room" button
  - [ ] "Add Service" button
  - [ ] "Post Payment" button
  - [ ] "View Reservation" button
  - [ ] "Do Not Disturb" toggle
- [ ] Console log: `lifecycleState: "departing-today"`, `displayStatus: "departing-today"`

---

### Scenario 6: Overstay (Past Check-Out Time)
**Test Room:** _____________  
**Current Time:** _____________ (after check-out time OR departure date < today)

#### Room Status View (Today)
- [ ] RoomTile shows status badge: "Overstay" (red with warning)
- [ ] Room displays guest name with overstay indicator
- [ ] Click room → Drawer opens
- [ ] Drawer lifecycle state: "overstay"
- [ ] Red destructive alert card displayed: "Overstay Alert — Guest was due out at [check-out time]"
- [ ] Status message includes departure date/time
- [ ] Quick Actions show:
  - [ ] "Force Checkout" button (DESTRUCTIVE variant)
  - [ ] "Extend Stay" button
  - [ ] "Transfer Room" button
  - [ ] "Apply Overstay Charge" button (outline, label changed from "Add Service")
  - [ ] "Post Payment" button
  - [ ] "View Reservation" button
  - [ ] "Do Not Disturb" toggle
- [ ] Console log: `lifecycleState: "overstay"`, `displayStatus: "overstay"`

---

### Scenario 7: Cleaning/Maintenance Room
**Test Room:** _____________

#### Cleaning Status
- [ ] Mark room as "Cleaning"
- [ ] RoomTile shows "Cleaning" badge (yellow)
- [ ] Click room → Drawer shows lifecycle displayStatus: "cleaning"
- [ ] Quick Actions show:
  - [ ] "Mark Clean" button (default variant)
- [ ] Console log: `displayStatus: "cleaning"`

#### Maintenance Status
- [ ] Mark room as "Maintenance"
- [ ] RoomTile shows "Maintenance" badge (orange)
- [ ] Click room → Drawer shows lifecycle displayStatus: "maintenance"
- [ ] Quick Actions show:
  - [ ] "Mark as Available" button (default variant)
- [ ] Console log: `displayStatus: "maintenance"`

---

### Scenario 8: Multi-Day Stay Spanning Today
**Test Room:** _____________  
**Check-In Date:** _____________ (yesterday or earlier)  
**Check-Out Date:** _____________ (tomorrow or later)  
**Booking Status:** checked_in

#### Room Status View (Today)
- [ ] RoomTile shows "Occupied" badge (guest is checked-in)
- [ ] Room displays guest details
- [ ] Click room → Drawer shows booking overlapping today
- [ ] Console log shows:
  - [ ] `overlappingCount: 1`
  - [ ] `checkInDate <= today AND checkOutDate >= today` evaluates to TRUE
  - [ ] `selectedBookingId: [correct-booking-id]`
- [ ] Lifecycle state: "in-house"
- [ ] Quick Actions: Check-Out, Extend, Transfer, Add Service, Post Payment

#### By Date View (Yesterday)
- [ ] Navigate to By Date, select yesterday (check-in date)
- [ ] Room shows "Occupied" status
- [ ] Click room → Same booking displayed
- [ ] Console log: `filterDate: [yesterday]`, booking overlaps

#### By Date View (Tomorrow)
- [ ] Navigate to By Date, select tomorrow (within stay)
- [ ] Room shows "Occupied" status
- [ ] Click room → Same booking displayed
- [ ] Console log: `filterDate: [tomorrow]`, booking overlaps

---

## Cross-Component Consistency Checks

### Console Log Validation
For EACH test scenario above, verify console logs match expectations:

```javascript
// RoomGrid Debug Output
ROOMGRID-DEBUG Phase-1 {
  roomId: "...",
  roomNumber: "...",
  today: "YYYY-MM-DD",
  viewDate: "YYYY-MM-DD",
  lifecycleStatus: "...",
  lifecycleState: "...",
  overlappingCount: N,
  selectedBookingId: "..." or null,
  bookings: [...]
}

// RoomTile Debug Output
TILE-DEBUG Phase-2 {
  roomId: "...",
  roomNumber: "...",
  canonicalStatus: "..." (from room.status),
  computedStatus: "...",
  hasCanonicalStatus: true/false,
  bookingsCount: N,
  activeBookingId: "..." or null,
  activeBookingStatus: "..."
}

// RoomActionDrawer Debug Output
DRAWER-BOOKING-DEBUG Phase-3 {
  roomId: "...",
  roomNumber: "...",
  filterDate: "YYYY-MM-DD",
  overlappingCount: N,
  selectedBookingId: "..." or null
}
```

### Consistency Assertions
For EACH scenario, verify:
- [ ] RoomGrid `selectedBookingId` === RoomTile `activeBookingId` === Drawer `selectedBookingId`
- [ ] RoomGrid `lifecycleStatus` === RoomTile `computedStatus` === Drawer lifecycle `displayStatus`
- [ ] RoomGrid `overlappingCount` === Drawer `overlappingCount`
- [ ] All three components use the SAME booking overlap rule: `checkInDate <= viewDate AND checkOutDate >= viewDate`

---

## Group Booking Validation

### Scenario 9: Group Booking (Multiple Rooms, Same Group)
**Test Group:** _____________  
**Rooms:** _____________, _____________, _____________

#### Room Status View
- [ ] All group rooms display group indicator badge
- [ ] Each room shows correct individual guest name
- [ ] Click any room → Drawer shows group badge in header
- [ ] "View Group Billing" button visible in drawer
- [ ] Quick Actions appropriate for individual room status
- [ ] Clicking "View Group Billing" navigates to `/dashboard/group-billing/[group-id]`

#### Group Billing Center
- [ ] Navigate to Group Billing Center
- [ ] Master folio displays correct group totals
- [ ] All child bookings listed with correct statuses
- [ ] Individual room folios linked to master folio
- [ ] Payment operations work correctly

---

## Regression Testing: Architectural Separation

### Room Status vs By Date View Separation
- [ ] Room Status (Today View) NEVER shows future reservations (arrival_date > today)
- [ ] By Date View shows ALL bookings for selected date (past, present, future)
- [ ] Changing date in By Date view does NOT affect Room Status view
- [ ] Both views use IDENTICAL overlap rule but DIFFERENT viewDate parameters
- [ ] Console logs confirm architectural separation

---

## Performance & Edge Cases

### Performance
- [ ] Room grid loads within 2 seconds for 30+ rooms
- [ ] No infinite loaders in any view
- [ ] Real-time subscription updates work correctly
- [ ] Opening drawer is instant (no delays)

### Edge Cases
- [ ] Room with 0 bookings: Shows "Available"
- [ ] Room with 1 booking: Correct status displayed
- [ ] Room with 2+ bookings: Correct overlap/priority selection
- [ ] Booking with check_in === check_out (same-day): Handled gracefully
- [ ] Booking with invalid dates: Error handling prevents crashes
- [ ] Manual room status override (maintenance): Respected in all views

---

## Acceptance Criteria

All scenarios above must pass with:
- ✅ Status badges consistent across RoomGrid, RoomTile, and RoomActionDrawer
- ✅ Booking details match in all components
- ✅ Quick Actions appropriate for lifecycle state
- ✅ Console logs show identical booking selection logic
- ✅ No "Available" rooms with active bookings
- ✅ No "Occupied" rooms without bookings
- ✅ Lifecycle alerts display correctly for departing/overstay guests
- ✅ Group bookings navigate to correct billing pages
- ✅ Room Status view excludes future reservations
- ✅ By Date view includes all relevant bookings for selected date

---

## Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**All Scenarios Passed:** [ ] YES [ ] NO  
**Issues Found:** ___________________  
**Ready for Production:** [ ] YES [ ] NO  

---

## Version History
- **PHASE-5-TESTING-V1:** Initial comprehensive testing checklist
