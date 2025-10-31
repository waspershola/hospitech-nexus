# Payment Flow Fix - Documentation

## Problem Summary

The payment system had critical issues:

1. **Double Tax Calculation**: When settling booking balances, taxes were calculated AGAIN on amounts that already included taxes
2. **Confusing UI**: Labels didn't clearly indicate what the user should enter
3. **No True Overpayment Support**: System couldn't properly handle overpayments
4. **Manager Approval Mislabeling**: Underpayments triggered "overpayment" approval modals

## Root Cause

The `PaymentForm` component treated ALL payments the same, regardless of context. It always ran tax calculations, even on booking payments that already had taxes included.

## Solution

### Two Payment Contexts

#### 1. Booking Payments (`isBookingPayment = true`)
- **Tax Handling**: NO tax recalculation (already calculated during booking creation)
- **Amount Source**: Uses `expectedAmount` prop with folio balance
- **UI**: Shows "Balance Due (from booking)"
- **Use Cases**: 
  - Front desk checkout payments
  - Partial payments during booking flow
  - Settlement of existing booking balances

#### 2. Ad-hoc Payments (`isBookingPayment = false`)
- **Tax Handling**: CALCULATES taxes using `calculateBookingTotal()`
- **Amount Source**: User enters amount, taxes calculated on the fly
- **UI**: Shows standard tax breakdown
- **Use Cases**:
  - Minibar charges
  - Laundry services
  - Room service
  - Other standalone transactions

### Key Changes

#### PaymentForm.tsx
- Added `expectedAmount` prop for explicit balance due
- Added `isBookingPayment` boolean flag
- Updated UI labels: "Amount Paying Now" and "Balance Due"
- Fixed payment type determination logic
- Improved manager approval threshold checks
- Enhanced payment info display with better visual feedback

#### QuickPaymentForm.tsx
- Fetches actual booking folio balance using `useBookingFolio`
- Passes `isBookingPayment={true}` to prevent tax recalculation
- Shows loading state while fetching folio

#### PaymentStep.tsx
- Fetches folio balance during booking flow
- Passes actual balance to PaymentForm
- Sets `isBookingPayment={true}` flag

#### ManagerApprovalModal.tsx
- Fixed approval text to distinguish overpayment vs underpayment
- Overpayment: "Guest is paying MORE than expected"
- Underpayment: "Guest is leaving with UNPAID balance"

## Business Rules

### Payment Type Classification

1. **Partial (Underpayment)**: `amountPaying < balanceDue`
   - Remaining balance tracked as receivable
   - Manager approval required if balance > ₦50,000
   
2. **Full**: `amountPaying == balanceDue`
   - Booking marked as paid
   - No approvals needed
   
3. **Overpayment**: `amountPaying > balanceDue`
   - Excess credited to guest wallet
   - Manager approval required if excess > ₦50,000

### Manager Approval Thresholds

- **Large Overpayment**: Excess > ₦50,000
- **Large Underpayment**: Remaining balance > ₦50,000

## Expected Behavior

### Example 1: Partial Payment (Room 106 Case)
- Total booking: ₦23,650 (taxes already included)
- First payment: ₦10,000
- Second payment attempt: ₦13,650

**Before Fix:**
- System recalculated taxes on ₦13,650
- Showed inflated amount with double taxation
- Confusing "Expected Amount: 0.00"

**After Fix:**
- Balance Due: ₦13,650 (no tax recalculation)
- Amount Paying Now: ₦13,650
- Payment Type: FULL
- ✓ Booking marked as paid

### Example 2: Overpayment
- Balance Due: ₦50,000
- Guest Pays: ₦75,000

**After Fix:**
- Balance Due: ₦50,000
- Amount Paying Now: ₦75,000
- Excess Amount: ₦25,000
- ✓ Excess credited to guest wallet
- No manager approval (< ₦50,000)

### Example 3: Large Underpayment
- Balance Due: ₦100,000
- Guest Pays: ₦13,650

**After Fix:**
- Balance Due: ₦100,000
- Amount Paying Now: ₦13,650
- Remaining Balance: ₦86,350
- ⚠️ Manager approval required (> ₦50,000)
- Receivable created for ₦86,350

## Testing Checklist

- [ ] Partial payment: Verify no tax recalculation on booking payments
- [ ] Full payment: Verify booking marked as paid
- [ ] Overpayment: Verify excess credited to wallet
- [ ] Large overpayment: Verify manager approval triggered
- [ ] Large underpayment: Verify manager approval with correct message
- [ ] Ad-hoc charge: Verify taxes ARE calculated for non-booking payments

## Important Rules

**NEVER recalculate taxes on amounts that already include taxes!**

This is enforced by the `isBookingPayment` flag which disables tax calculation when `true`.
