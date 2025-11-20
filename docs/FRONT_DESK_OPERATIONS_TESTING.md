# Front Desk Operations Testing & Validation

## Phase 7: Testing Matrix & Acceptance Criteria
**Version**: FRONT-DESK-OPS-V1  
**Date**: 2025-01-20  
**Status**: Ready for Testing

---

## Overview

This document provides comprehensive testing procedures for the five critical front-desk operations that have been systematically remediated across Phases 1-6:

1. **Cancel Booking** (Edge Function: `cancel-booking`, Version: CANCEL-V2)
2. **Amend Booking** (Edge Function: `amend-booking`, Version: AMEND-BOOKING-V1)
3. **Extend Stay** (Edge Function: `extend-stay`, Version: EXTEND-STAY-V1)
4. **Transfer Room** (Edge Function: `transfer-room`, Version: TRANSFER-ROOM-V1)
5. **Add Service/Charge** (Database: `hotel_services`, Hook: `useHotelServices`, Version: HOTEL-SERVICES-V1)

---

## Critical Requirements (All Operations)

### Mandatory Checks
- ✅ **Tenant Isolation**: All queries include `.eq('tenant_id', tenantId)`
- ✅ **Folio Integration**: Financial operations post to `stay_folios` via `folio_transactions`
- ✅ **Idempotent Logic**: Safe to retry operations without duplicate effects
- ✅ **Audit Trail**: All operations logged in `hotel_audit_logs` or `finance_audit_events`
- ✅ **React Query Cache**: Invalidates relevant queries on success
- ✅ **Error Handling**: Comprehensive logging and user-friendly error messages

---

## Test Case 1: Cancel Booking

### Pre-Conditions
- Booking exists with status `reserved` or `checked_in`
- User has permission to cancel bookings
- Tenant ID is valid

### Test Scenarios

#### Scenario 1A: Cancel Reserved Booking (Pre-Check-In)
**Steps**:
1. Navigate to Front Desk → Select room with `reserved` booking
2. Open RoomActionDrawer → Click "Cancel Booking"
3. Enter cancellation reason: "Guest requested cancellation"
4. Click "Confirm Cancellation"

**Expected Results**:
- ✅ Booking status changes to `cancelled`
- ✅ Room status changes to `available`
- ✅ Cancel reason stored in `bookings.metadata.cancellation`
- ✅ Success toast: "Booking cancelled successfully"
- ✅ RoomActionDrawer closes
- ✅ Room card updates to show "Available" status
- ✅ Audit log entry created in `hotel_audit_logs`

**Edge Function Logs** (Check `/functions/cancel-booking/logs`):
```
[CANCEL-V2] Starting cancellation for booking: {booking_id}
[CANCEL-V2] Booking status: reserved, Room status: reserved
[CANCEL-V2] Successfully cancelled booking
```

#### Scenario 1B: Cancel Checked-In Booking (With Open Folio)
**Steps**:
1. Check in a guest (creates open folio)
2. Add charge: Room Service ₦5,000
3. Collect payment: Cash ₦3,000
4. Open RoomActionDrawer → Cancel Booking
5. Enter reason: "Emergency cancellation"
6. Confirm

**Expected Results**:
- ✅ Booking status changes to `cancelled`
- ✅ Room status changes to `cleaning`
- ✅ Open folio status changes to `closed`
- ✅ Folio balance remains accurate (₦2,000 outstanding)
- ✅ Cancellation audit trail includes folio ID
- ✅ Finance audit event created

**Edge Function Logs**:
```
[CANCEL-V2] Found open folio: {folio_id} with balance: ₦2000
[CANCEL-V2] Closing folio for cancelled booking
[CANCEL-V2] Cancellation complete with folio closure
```

#### Scenario 1C: Cancel Booking - Error Handling
**Test**: Try to cancel booking that doesn't exist
**Expected**: Error toast: "Booking not found" + edge function logs error

---

## Test Case 2: Amend Booking

### Pre-Conditions
- Booking exists (any status except `cancelled`)
- New dates/room must be available
- User has amend permissions

### Test Scenarios

#### Scenario 2A: Amend Reserved Booking (Change Dates Only)
**Steps**:
1. Select room with reserved booking (Jan 15-17, Rate: ₦10,000/night)
2. RoomActionDrawer → "Amend Booking"
3. Change check-out: Jan 15-20 (add 3 nights)
4. Click "Save Changes"

**Expected Results**:
- ✅ Booking dates updated in database
- ✅ Booking `metadata.amendments` array includes entry
- ✅ No folio operations (pre-check-in)
- ✅ Success toast: "Booking amended successfully"
- ✅ Booking card shows new dates

**Edge Function Logs**:
```
[AMEND-BOOKING-V1] Amending booking {booking_id}
[AMEND-BOOKING-V1] Date change: 2025-01-15 to 2025-01-20
[AMEND-BOOKING-V1] No folio adjustment needed (pre-check-in)
```

#### Scenario 2B: Amend Checked-In Booking (With Price Adjustment)
**Setup**:
- Guest checked in (Jan 15-17, ₦10,000/night = ₦30,000 total)
- Open folio exists

**Steps**:
1. RoomActionDrawer → "Amend Booking"
2. Extend checkout to Jan 20 (+3 nights)
3. New rate override: ₦12,000/night
4. Amendment reason: "Guest extended stay at higher rate"
5. Save

**Expected Results**:
- ✅ Booking dates updated
- ✅ New total calculated: 5 nights × ₦12,000 = ₦60,000
- ✅ Price difference: ₦60,000 - ₦30,000 = ₦30,000
- ✅ Folio charge posted: "Booking Amendment - Extended Stay" ₦30,000
- ✅ Folio balance increases by ₦30,000
- ✅ Amendment stored in `metadata.amendments`

**Edge Function Logs**:
```
[AMEND-BOOKING-V1] Found open folio: {folio_id}
[AMEND-BOOKING-V1] Price difference: ₦30,000.00
[AMEND-BOOKING-V1] Posting adjustment charge to folio
[AMEND-BOOKING-V1] Successfully posted charge via folio_post_charge
```

#### Scenario 2C: Amend Booking (Transfer Room)
**Steps**:
1. Guest in Room 101 (checked-in)
2. Amend → Change room to 205
3. Reason: "Guest requested upgrade"
4. Save

**Expected Results**:
- ✅ Booking `room_id` updated to Room 205
- ✅ Room 101 status → `cleaning`
- ✅ Room 205 status → `occupied`
- ✅ Folio `room_id` updated to Room 205
- ✅ Amendment logged with old/new room numbers

---

## Test Case 3: Extend Stay

### Pre-Conditions
- Booking status = `checked_in`
- New checkout date must be after current checkout
- Room must be available for extended period

### Test Scenarios

#### Scenario 3A: Extend Checked-In Booking
**Setup**:
- Guest checked in Room 103 (Jan 15-17, Rate: ₦15,000/night)
- Current folio balance: ₦45,000

**Steps**:
1. RoomActionDrawer → "Extend Stay"
2. Current checkout: Jan 17
3. New checkout: Jan 20 (+3 nights)
4. Click "Extend Stay"

**Expected Results**:
- ✅ Booking `check_out` updated to Jan 20
- ✅ Additional charge calculated: 3 nights × ₦15,000 = ₦45,000
- ✅ Folio charge posted: "Stay Extension - 3 additional nights"
- ✅ Folio balance increases to ₦90,000
- ✅ Extension logged in `bookings.metadata.extensions`
- ✅ Success toast displayed

**Edge Function Logs**:
```
[EXTEND-STAY-V1] Extending stay for booking {booking_id}
[EXTEND-STAY-V1] Current checkout: 2025-01-17, New: 2025-01-20
[EXTEND-STAY-V1] Additional nights: 3, Rate: ₦15,000
[EXTEND-STAY-V1] Posting charge: ₦45,000.00
[EXTEND-STAY-V1] Successfully extended stay
```

#### Scenario 3B: Extend Stay - Room Conflict
**Test**: Try to extend when room is already booked for new dates
**Expected**: Error toast: "Room is not available for the selected dates"

---

## Test Case 4: Transfer Room

### Pre-Conditions
- Booking status = `checked_in`
- Target room must be `available` or `cleaning`
- User has transfer permissions

### Test Scenarios

#### Scenario 4A: Transfer to Available Room (Same Rate)
**Setup**:
- Guest in Room 101 (₦10,000/night, 3 nights = ₦30,000)
- Room 102 available with same rate

**Steps**:
1. RoomActionDrawer → "Transfer Room"
2. Current room: 101
3. New room: Select 102 from dropdown
4. Reason: "Guest complained about noise"
5. Click "Transfer Room"

**Expected Results**:
- ✅ Booking `room_id` updated to Room 102
- ✅ Room 101 status → `cleaning`
- ✅ Room 102 status → `occupied`
- ✅ Folio `room_id` updated to Room 102
- ✅ No price adjustment (same rate)
- ✅ Transfer logged in audit and `metadata.room_transfers`
- ✅ Success toast: "Guest transferred to Room 102"

**Edge Function Logs**:
```
[TRANSFER-ROOM-V1] Transferring booking {booking_id}
[TRANSFER-ROOM-V1] From Room 101 to Room 102
[TRANSFER-ROOM-V1] No rate difference detected
[TRANSFER-ROOM-V1] Updated room statuses
[TRANSFER-ROOM-V1] Transfer completed successfully
```

#### Scenario 4B: Transfer to Higher-Priced Room
**Setup**:
- Guest in Room 101 (₦10,000/night, 2 nights remaining)
- Transfer to Suite 301 (₦20,000/night)

**Steps**:
1. Transfer Room → Select Suite 301
2. Reason: "Upgrade to suite"
3. Confirm

**Expected Results**:
- ✅ Room transfer executed
- ✅ Rate difference: (₦20,000 - ₦10,000) × 2 nights = ₦20,000
- ✅ Folio charge posted: "Room Transfer - Upgrade to Suite 301"
- ✅ Folio balance increases by ₦20,000

**Edge Function Logs**:
```
[TRANSFER-ROOM-V1] Rate difference detected: ₦10,000.00 per night
[TRANSFER-ROOM-V1] Remaining nights: 2
[TRANSFER-ROOM-V1] Posting adjustment charge: ₦20,000.00
```

---

## Test Case 5: Add Service/Charge (Database-Driven)

### Pre-Conditions
- `hotel_services` table populated with services
- Booking exists (checked-in for direct folio posting)
- User has charge permissions

### Test Scenarios

#### Scenario 5A: Add Service to Checked-In Guest
**Steps**:
1. RoomActionDrawer → "Add Charge"
2. Select Category: "Room Service"
3. Select Service: "Continental Breakfast" (default: ₦5,000)
4. Override amount: ₦6,000
5. Notes: "Extra portion requested"
6. Click "Add Charge"

**Expected Results**:
- ✅ Charge posted to open folio via `folio_post_charge`
- ✅ Folio transaction created:
  - Type: `charge`
  - Amount: ₦6,000
  - Description: "Continental Breakfast"
  - Metadata includes: `service_id`, `service_category`, `service_name`
- ✅ Folio balance increases by ₦6,000
- ✅ Success toast: "Charge added successfully"
- ✅ Transaction appears in Payments tab immediately

**Database Verification**:
```sql
SELECT * FROM folio_transactions 
WHERE folio_id = '{folio_id}' 
AND description = 'Continental Breakfast'
AND amount = 6000;
```

#### Scenario 5B: Add Multiple Services (Different Categories)
**Steps**:
1. Add Charge → "Spa" → "Swedish Massage" (₦15,000)
2. Add Charge → "Laundry" → "Express Wash & Iron" (₦3,000)
3. Add Charge → "Minibar" → "Soft Drinks" (₦1,500)

**Expected Results**:
- ✅ Three separate folio transactions created
- ✅ Each with correct `service_category` in metadata
- ✅ Total folio balance increases by ₦19,500
- ✅ All services appear in transaction history with proper categories

#### Scenario 5C: Service Catalog Loading
**Test**: Open AddChargeModal
**Expected**:
- ✅ Category dropdown populated from `hotel_services` WHERE `active = true`
- ✅ Services grouped by category
- ✅ Services sorted by `display_order`
- ✅ Default amounts auto-filled when service selected
- ✅ Loading state shown while fetching services
- ✅ Graceful error if no services configured

---

## Cross-Cutting Test Cases

### CC-1: Tenant Isolation Verification
**Test**: Create test tenant, perform all operations
**Verify**: No cross-tenant data leakage in any query results

### CC-2: React Query Cache Invalidation
**Test**: Open two browser tabs with same booking
**Perform**: Any operation in Tab 1
**Verify**: Tab 2 updates within 2-3 seconds after operation

### CC-3: Multi-Tab Real-Time Sync
**Test**: Open RoomActionDrawer in Tab 1, Billing Center in Tab 2
**Perform**: Add charge in Tab 1
**Verify**: Folio balance updates in Tab 2 via `FOLIO_UPDATED` event broadcast

### CC-4: Audit Trail Completeness
**Verify**: All operations create entries in:
- `hotel_audit_logs` (for room/booking changes)
- `finance_audit_events` (for folio operations)

---

## Acceptance Criteria Checklist

### Phase 1-6 Deliverables
- [x] Phase 1: Tenant isolation filters added (MANDATORY-TENANT-V1)
- [x] Phase 2: Extend Stay edge function (EXTEND-STAY-V1)
- [x] Phase 3: Amend Booking edge function (AMEND-BOOKING-V1)
- [x] Phase 4: Transfer Room edge function (TRANSFER-ROOM-V1)
- [x] Phase 5: Hotel Services table + AddChargeModal (HOTEL-SERVICES-V1)
- [x] Phase 6: Enhanced Cancel Booking logging (CANCEL-V2)

### Edge Function Deployment Verification
- [ ] `extend-stay` deployed and accessible
- [ ] `amend-booking` deployed and accessible
- [ ] `transfer-room` deployed and accessible
- [ ] `cancel-booking` (V2) deployed and accessible

### Database Verification
- [ ] `hotel_services` table exists with RLS policies
- [ ] Default services populated for all tenants
- [ ] All edge functions use 4-parameter wrapper pattern

### UI/UX Verification
- [ ] All modals show loading states during operations
- [ ] All success operations show toast notifications
- [ ] All errors show user-friendly error messages
- [ ] All operations close drawer/modal on success

### Financial Integration
- [ ] All charge operations post to `stay_folios`
- [ ] Folio balances calculate correctly
- [ ] Transaction history displays all operations
- [ ] No duplicate charge entries

---

## Regression Testing

### Critical Paths to Verify
1. **Standard Check-In Flow**: Still creates folio correctly
2. **Quick Payment**: Still posts to folio without issues
3. **QR Request → Folio**: Auto-linking still works
4. **Reservation Payments**: Still attach on check-in
5. **Group Bookings**: Not affected by front-desk operation changes

---

## Known Issues & Limitations

### Current Limitations
1. **Pre-Check-In Amendments**: Don't post folio adjustments (by design)
2. **Cancelled Booking Folios**: Remain closed, no reopening
3. **Service Catalog**: Requires manual population via database
4. **Room Transfer**: Requires available target room (no double-booking)

### Future Enhancements (Out of Scope)
- Batch cancellations
- Automated refund calculation
- Service catalog management UI
- Room transfer with rate negotiation
- Amendment approval workflow

---

## Testing Timeline

### Phase 7: Testing & Validation (Current)
**Duration**: 2-3 hours  
**Participants**: Front-desk staff + QA team

### Recommended Testing Order
1. **Day 1**: Test Cases 1-2 (Cancel, Amend) - 1 hour
2. **Day 1**: Test Cases 3-4 (Extend, Transfer) - 1 hour  
3. **Day 2**: Test Case 5 (Add Service) - 30 minutes
4. **Day 2**: Cross-cutting tests + Regression - 1 hour

---

## Sign-Off

### Phase 7 Completion Criteria
- [ ] All 5 test cases pass without critical failures
- [ ] Cross-cutting tests verify tenant isolation + cache invalidation
- [ ] Edge function logs show correct version markers
- [ ] No regression in existing workflows
- [ ] Documentation reviewed and approved

**Testing Lead**: _________________  
**Date**: _________________  
**Status**: ⬜ PASSED | ⬜ FAILED | ⬜ BLOCKED

---

## Troubleshooting Guide

### Common Issues

#### Issue: "Booking not found" error
**Check**: Verify `tenant_id` in query
**Solution**: Ensure `.eq('tenant_id', tenantId)` in all queries

#### Issue: Charge not appearing in folio
**Check**: Edge function logs for RPC call errors
**Solution**: Verify `folio_post_charge` succeeded

#### Issue: Room status not updating
**Check**: Database trigger `sync_room_status_on_booking_change`
**Solution**: Verify trigger is active and not disabled

#### Issue: Service catalog empty
**Check**: `SELECT * FROM hotel_services WHERE tenant_id = '{tenant_id}' AND active = true`
**Solution**: Populate default services via migration

---

**END OF TESTING DOCUMENTATION**
