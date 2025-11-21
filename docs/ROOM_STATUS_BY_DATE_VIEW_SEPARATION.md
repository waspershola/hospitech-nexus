# Room Status vs By Date View Architecture

## Critical Design Principle

The Front Desk contains **two distinct operational views** with strict architectural separation:

### 1. Room Status (Today View)
- **Purpose**: Operational reality for TODAY only
- **Component**: `RoomGrid.tsx` + `RoomStatusOverview.tsx`
- **Booking Selection Rule**: `checkInDate <= TODAY AND checkOutDate >= TODAY`
- **Display**: Shows rooms with checked-in guests, arrivals today, and departures today
- **Excludes**: Future reservations (check_in > today)

### 2. By Date (Planning Mode)
- **Purpose**: Shows past, present, and future bookings for ANY selected date
- **Component**: `AvailabilityCalendar.tsx` + `useRoomAvailabilityByDate` hook
- **Booking Selection Rule**: `checkInDate <= SELECTED_DATE AND checkOutDate >= SELECTED_DATE`
- **Display**: Shows ALL bookings overlapping the selected date
- **Includes**: Future reservations, past stays, group bookings for future dates

## Why This Separation Matters

### Room Status MUST NOT show future bookings because:
1. Staff need to focus on TODAY's operations (arrivals, departures, in-house guests)
2. Future reservations create UI clutter in operational mode
3. Guests arriving tomorrow don't need actions TODAY
4. This matches standard PMS operational patterns

### By Date MUST show future bookings because:
1. It's a planning tool for any date (tomorrow, next week, next month)
2. Staff need to see availability and reservations for future dates
3. Group bookings span multiple future dates
4. Revenue management requires forward visibility

## The Overlap Rule (Shared, Safe for Both)

Both views use the same overlap logic with different `viewDate`:

```typescript
// Room Status: viewDate = TODAY
const overlappingBookings = bookings.filter(b => {
  return checkInDate <= TODAY && checkOutDate >= TODAY;
});

// By Date: viewDate = SELECTED_DATE
const overlappingBookings = bookings.filter(b => {
  return checkInDate <= SELECTED_DATE && checkOutDate >= SELECTED_DATE;
});
```

## The Bug We Fixed

**Before Fix** (WRONG):
- Room Status tried to implement Priority 3 for "future bookings"
- Comment said "IGNORE future bookings" but didn't properly filter them
- Lifecycle helper received `null` for future reservations
- Rooms with future bookings showed as "Available"

**After Fix** (CORRECT):
- Room Status uses overlap rule with `viewDate = TODAY`
- Naturally excludes future bookings (check_in > today) WITHOUT explicit "ignore" logic
- Lifecycle helper receives actual bookings for today's operations
- Future bookings appear ONLY in By Date view

## Priority-Based Booking Selection (Room Status)

When multiple bookings overlap today (rare but possible in edge cases):

1. **Priority 1**: Checked-in guests (status = 'checked_in')
   - These are guests currently occupying the room
   - Most important for operations
   
2. **Priority 2**: Arrivals today (status = 'reserved' AND check_in = today)
   - Guests expected to check in today
   - Need check-in actions enabled/disabled based on check-in time
   
3. **Priority 3**: Other overlapping bookings
   - Reserved multi-day stays that span today
   - Fallback for edge cases

## Room Status Lifecycle States

Based on the selected `activeBooking` and current time:

| State | Condition | Badge | Quick Actions |
|-------|-----------|-------|---------------|
| **Vacant/Available** | No overlapping booking | Green "Available" | Assign Room, Walk-in Check-In |
| **Reserved (Pre Check-in)** | Reserved, arriving today, before check-in time | "Reserved" | Amend, Cancel, View (Check-In disabled) |
| **Reserved (Ready)** | Reserved, arriving today, after check-in time | "Reserved" | Amend, Cancel, View, **Check-In** |
| **In-House** | Checked-in, checkout > today OR (checkout = today AND before checkout time) | "Occupied" | Payment, Charge, Extend, Transfer, Checkout, Folio |
| **Departing Today** | Checked-in, checkout = today, before checkout time | Orange "Departing Today" | Same as In-House + Alert |
| **Overstay** | Checked-in, checkout <= today, after checkout time, not checked out | Red "Overstay" | Payment, Charge, Extend, Transfer, Checkout |

## By Date View States

Shows booking status for ANY selected date:

- Future reservations (check_in > today) appear when selecting future dates
- Past stays appear when selecting historical dates
- Group bookings visible across all their booked dates
- Same lifecycle logic applies but with `selectedDate` instead of `today`

## Example Scenarios

### Scenario 1: Future Group Booking
- **Booking**: Room 102, check-in 2025-11-20, check-out 2025-11-22
- **Today**: 2025-11-18
- **Room Status view**: Shows "Available" (correct - room is vacant TODAY)
- **By Date view (2025-11-20)**: Shows "Reserved" with group details

### Scenario 2: Arriving Today
- **Booking**: Room 105, check-in 2025-11-18, check-out 2025-11-20
- **Today**: 2025-11-18, 10:00 AM (before 14:00 check-in)
- **Room Status view**: Shows "Reserved" with Check-In disabled
- **Room Status view** (same day, 15:00): Shows "Reserved" with Check-In **enabled**

### Scenario 3: Departing Today
- **Booking**: Room 108, check-in 2025-11-16, check-out 2025-11-18
- **Today**: 2025-11-18, 09:00 AM (before 12:00 checkout)
- **Room Status view**: Shows "Departing Today" with checkout alert
- **Room Status view** (same day, 13:00): Shows "Overstay" if not checked out

## Version Markers

- `ROOM-STATUS-OVERLAP-V1`: Fixed booking overlap logic in RoomGrid (2025-11)
- `DRAWER-BOOKING-FIX-V1`: Drawer overlap logic (already correct)
- `GRID-LIFECYCLE-V1`: Original lifecycle helper integration
- `DOCS-ROOM-STATUS-SEPARATION-V1`: This documentation file

## Testing Checklist

When modifying either view, verify:

- [ ] Room Status shows only TODAY's operations (no future reservations)
- [ ] By Date shows correct bookings for selected date (including future)
- [ ] Arriving-today guests appear in Room Status with correct check-in actions
- [ ] Departing-today guests show orange badge before checkout time
- [ ] Overstays show red badge after checkout time
- [ ] Future group bookings appear in By Date but NOT in Room Status
- [ ] Quick Actions match the displayed room status
- [ ] Multi-tab consistency maintained
