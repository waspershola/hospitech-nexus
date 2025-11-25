# Phase 5: Folio & Payment Offline - COMPLETE ✅

## Implementation Summary

Phase 5 adds comprehensive offline folio and payment operations with local balance calculations, charge posting, and provider/location tracking.

## What Was Built

### 1. **Offline Folio Manager** (`src/lib/offline/offlineFolioManager.ts`)
- **Create Folio Offline**: Generate UUIDs, store in IndexedDB with initial balance = 0
- **Post Charge Offline**: Create local folio transactions, recalculate balance automatically
- **Post Payment Offline**: Link payments to folios, update balance locally
- **Balance Calculations**: Real-time local totals (charges - payments = balance)
- **Transaction History**: Retrieve all transactions for a folio from IndexedDB
- **Folio Lookup**: Find folios by booking ID, check existence, get balance

### 2. **Offline Payment Manager** (`src/lib/offline/offlinePaymentManager.ts`)
- **Record Payment Offline**: Generate transaction ref (`OFF-{timestamp}-{id}`), store with provider/location context
- **Folio Linking**: Automatically link payments to folio if exists locally
- **Provider/Location Tracking**: Store payment method, provider name, location name in metadata
- **Payment Retrieval**: Get payments by booking, payment ID, or all offline payments pending sync
- **Total Calculations**: Sum payments for booking from local storage

### 3. **Enhanced Hooks**

#### `useOfflineAwareFolioCharge` (Updated)
- Detects offline mode (Electron + no connection)
- Posts charges locally via `offlineFolioManager.postChargeOffline()`
- Recalculates folio balance automatically
- Shows distinct toast: "Charge posted locally (offline mode)"
- Falls back to online queueing if just offline (not Electron)

#### `useOfflineAwarePayment` (Updated)
- Detects offline mode (Electron + no connection)
- Records payments locally via `offlinePaymentManager.recordPaymentOffline()`
- Attempts automatic folio linking if folio exists in IndexedDB
- Stores provider/location context in metadata
- Shows distinct toast: "Payment recorded locally (offline mode)"
- Falls back to online queueing if just offline (not Electron)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Offline Folio & Payment Flow                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Staff Action (Add Charge / Collect Payment)             │
│     ↓                                                        │
│  2. Check Online Status (navigator.onLine + Electron)       │
│     ├─→ ONLINE: Use offlineAwareClient (queue if needed)   │
│     └─→ OFFLINE: Use local managers                        │
│         ↓                                                    │
│  3. Local Operations                                         │
│     ├─→ Charge: offlineFolioManager.postChargeOffline()    │
│     │   ├─→ Create CachedFolioTransaction                  │
│     │   ├─→ Store in IndexedDB (folio_transactions)        │
│     │   └─→ Recalculate folio balance                      │
│     │                                                        │
│     └─→ Payment: offlinePaymentManager.recordPaymentOffline()│
│         ├─→ Create CachedPayment with provider/location    │
│         ├─→ Store in IndexedDB (payments)                  │
│         ├─→ Link to folio (if exists)                      │
│         └─→ Post payment transaction to folio              │
│     ↓                                                        │
│  4. Balance Recalculation (Automatic)                        │
│     ├─→ Get all transactions for folio                     │
│     ├─→ Sum charges, sum payments                          │
│     ├─→ Calculate balance = charges - payments             │
│     └─→ Update folio record in IndexedDB                   │
│     ↓                                                        │
│  5. Toast Notification                                       │
│     └─→ "Charge/Payment posted locally (offline mode)"     │
│                                                              │
│  6. Sync When Online (Phase 4 Sync Engine)                  │
│     ├─→ Folios: Create on server with _offline_metadata    │
│     ├─→ Transactions: Post charges/payments to server       │
│     ├─→ Payments: Record with provider/location context     │
│     └─→ Conflict Resolution: Desktop wins                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Local Balance Calculation Logic

**Accurate offline balance tracking**:
1. When charge posted: Add to `total_charges`, update `balance`
2. When payment posted: Add to `total_payments`, update `balance`
3. Formula: `balance = total_charges - total_payments`
4. Stored in `CachedFolio` record (updated every transaction)
5. Synced when online: Server recalculates from authoritative DB

**Example**:
```
Initial:  Charges=0, Payments=0, Balance=0
+ Charge ₦15,000: Charges=15000, Payments=0, Balance=15000
+ Charge ₦5,000:  Charges=20000, Payments=0, Balance=20000
+ Payment ₦10,000: Charges=20000, Payments=10000, Balance=10000
```

## Offline Transaction Refs

Payments created offline get unique transaction refs:
- Format: `OFF-{timestamp}-{uuid_prefix}`
- Example: `OFF-1737025800000-A3F8B2C1`
- Prevents collisions with online payments
- Easy to identify offline-originated transactions

## Provider/Location Context

All offline payments store:
```json
{
  "payment_method": "Cash",
  "provider_id": "uuid",
  "provider_name": "Cash Box",
  "location_id": "uuid",
  "location_name": "Front Desk",
  "offline_created": true,
  "offline_created_at": "2025-01-16T10:30:00Z"
}
```

This enables proper financial reconciliation after sync.

## Testing Checklist

### In Browser (No Offline Mode)
1. ✅ Add charge → should use online edge function
2. ✅ Collect payment → should use online edge function
3. ✅ Verify no "offline mode" toasts appear

### In Electron (Offline Mode)
1. ✅ Start Electron app: `npm run dev:electron`
2. ✅ Go offline (disable Wi-Fi)
3. ✅ Add charge to folio → verify toast: "Charge posted locally (offline mode)"
4. ✅ Check IndexedDB → verify `folio_transactions` has charge
5. ✅ Verify folio balance updates immediately (no page refresh needed)
6. ✅ Collect payment → verify toast: "Payment recorded locally (offline mode)"
7. ✅ Check IndexedDB → verify `payments` has payment with `OFF-` ref
8. ✅ Verify folio balance updates (charges - payments)
9. ✅ Add multiple charges/payments → verify accurate balance calculation
10. ✅ Go online (enable Wi-Fi) → verify auto-sync triggers
11. ✅ Check server DB → verify all charges/payments synced correctly
12. ✅ Verify conflict resolution (desktop wins if server changed during offline period)

### Balance Calculations
1. ✅ Create folio offline → verify balance starts at 0
2. ✅ Add charge ₦15,000 → verify balance = ₦15,000
3. ✅ Add charge ₦5,000 → verify balance = ₦20,000
4. ✅ Collect payment ₦10,000 → verify balance = ₦10,000
5. ✅ Collect payment ₦10,000 → verify balance = ₦0
6. ✅ Verify all transactions appear in folio history
7. ✅ Sync to server → verify server calculates same balance

### Provider/Location Tracking
1. ✅ Collect payment with provider/location → verify metadata stored
2. ✅ Verify `provider_name` and `location_name` in IndexedDB
3. ✅ Sync to server → verify provider/location context preserved
4. ✅ Verify financial reports show correct payment source

## Integration Points

### Components Using Offline Folio/Payment
- `PaymentForm` (uses `useOfflineAwarePayment`)
- `FrontDeskAddChargeModal` (uses `useOfflineAwareFolioCharge`)
- `QRRequestDrawer` (collect payment action)
- `RoomActionDrawer` (add charge action)

### Hooks Depending on Managers
- `useOfflineAwareFolioCharge` → `offlineFolioManager`
- `useOfflineAwarePayment` → `offlinePaymentManager`
- Future: `useOfflineCheckout` (Phase 6)

## Success Criteria

✅ **Offline Folio Creation**: Folios created locally with UUID generation  
✅ **Offline Charge Posting**: Charges stored in IndexedDB with automatic balance update  
✅ **Offline Payment Recording**: Payments stored with provider/location context  
✅ **Balance Calculations**: Accurate real-time balance from local transactions  
✅ **Transaction History**: Complete folio transaction list from IndexedDB  
✅ **Folio Linking**: Payments automatically link to folio if exists locally  
✅ **Sync Integration**: Local data syncs when online via Phase 4 engine  
✅ **Conflict Resolution**: Desktop data wins with `_offline_metadata` marker  
✅ **Provider/Location Context**: Payment source tracked for reconciliation  
✅ **Transaction Refs**: Unique offline refs (`OFF-{timestamp}-{id}`)  

## Next Steps

**Phase 6: Printing** (Estimated: 3-4 hours)
- Offline receipt generation (HTML → PDF → Print)
- Folio PDF printing without server
- Network-independent printing via Electron IPC
- Print queue for offline print jobs

---

**Phase 5 Complete**: Folio and payment operations fully functional in offline mode with accurate local balance calculations and provider/location tracking.
