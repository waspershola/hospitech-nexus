# Group Billing UI Architecture

**Version:** GROUP-BILLING-UI-V1  
**Last Updated:** 2025-11-21

## Overview

This document describes the canonical data model and UI architecture for the Group Billing system in LuxuryHotelPro. The system ensures consistent folio display across all group booking interfaces.

## Canonical Data Model

### Single Source of Truth: `useGroupMasterFolio` Hook

All group folio data flows through the `useGroupMasterFolio(groupBookingId)` hook, which returns:

```typescript
interface GroupMasterFolioData {
  master_folio: {
    id: string;
    folio_number: string;
    folio_type: string;
    total_charges: number;
    total_payments: number;
    balance: number;
    status: string;
    created_at: string;
  };
  
  child_folios: GroupChildFolio[];
  
  aggregated_balances: {
    total_charges: number;
    total_payments: number;
    outstanding_balance: number;
    children_breakdown: ChildBreakdown[];
  };
}
```

### Key Architectural Principles

1. **Backend as Source of Truth**: All totals come from database aggregations via `get_group_master_folio` RPC
2. **No Frontend Calculations**: UI components display data as-is from the hook, never recalculate
3. **Consistent Formatting**: All monetary displays use shared utilities from `src/lib/folio/formatters.ts`
4. **Master-Child Relationship**: Master folio aggregates child folios via `sync_master_folio_totals` RPC

## Shared Formatting Utilities

Location: `src/lib/folio/formatters.ts`

### Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `formatFolioMoney(amount, currency)` | Format currency with symbol | `₦50,000.00` |
| `isCredit(balance)` | Check if balance is negative | `true` if `balance < 0` |
| `getCreditLabel(balance, currency)` | Format credit balance | `Credit: ₦30,000.00` |
| `getBalanceColor(balance)` | Get Tailwind color class | `text-destructive` / `text-green-600` |
| `getFolioStatusVariant(status)` | Get badge variant | `default` / `secondary` |

### Color Semantics

- **Positive Balance (Debt)**: `text-destructive` (red) - Guest owes money
- **Negative Balance (Credit)**: `text-green-600` (green) - Overpayment/credit
- **Zero Balance**: `text-muted-foreground` (neutral) - Fully settled

## UI Components

### 1. GroupFolioSummaryCard

**Location:** `src/components/groups/GroupFolioSummaryCard.tsx`

**Data Source:** `aggregatedBalances` prop from `useGroupMasterFolio`

**Display Logic:**
- Shows **Outstanding Balance** prominently (not "Master Balance")
- Includes subtitle: "Totals are aggregated from all child folios for this group"
- Breakdown section shows per-room charges/payments/balance
- Credit folios display "Credit" badge in breakdown rows

**Invariants:**
```typescript
aggregatedBalances.outstanding_balance === sum(children_breakdown.map(c => c.balance))
aggregatedBalances.total_charges === sum(children_breakdown.map(c => c.charges))
aggregatedBalances.total_payments === sum(children_breakdown.map(c => c.payments))
```

### 2. GroupChildFolioCard

**Location:** `src/components/groups/GroupChildFolioCard.tsx`

**Data Source:** Individual `child_folios` items from `useGroupMasterFolio`

**Display Logic:**
- Shows folio number, status badge, guest info, room number
- Financial summary: Charges / Payments / Balance
- "Credit Folio" badge (with tooltip) for negative balances
- "View Folio" button navigates to `/dashboard/billing/:folioId`

**Must Match:** Corresponding breakdown row in `GroupFolioSummaryCard`

### 3. RoomActionDrawer Folio Section

**Location:** `src/modules/frontdesk/components/RoomActionDrawer.tsx` (lines 1084-1170)

**Data Source:** `useBookingFolio(bookingId)` hook

**Display Logic:**
- Shows Charges / Payments breakdown
- Displays Balance prominently with credit handling
- For group rooms: includes "View Group Billing" button
- Links to Group Billing Center page with `groupInfo.group_id`

**Must Match:** Corresponding child folio card on Group Billing Center page

### 4. GroupBillingCenter Page

**Location:** `src/pages/dashboard/GroupBillingCenter.tsx`

**Data Source:** `useGroupMasterFolio(actualGroupId)` hook

**Layout:**
- Header with navigation and group actions
- Master folio summary card
- Grid of child folio cards
- Tabbed transaction history (master + all children)

## Data Flow Diagram

```
┌─────────────────────────────────────────────┐
│  Database (stay_folios + folio_transactions) │
└────────────────┬────────────────────────────┘
                 │
                 │ get_group_master_folio RPC
                 │ sync_master_folio_totals RPC
                 ▼
        ┌────────────────────┐
        │ useGroupMasterFolio │
        │        Hook         │
        └────────┬────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
     ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Summary │ │  Child  │ │  Room   │
│  Card   │ │  Cards  │ │ Drawer  │
└─────────┘ └─────────┘ └─────────┘
     │           │           │
     └───────────┴───────────┘
              │
              ▼
     Shared Formatters
     (formatFolioMoney, etc.)
```

## UI Consistency Rules

### Cross-Component Consistency

1. **Same folio = same numbers**: Child folio card and room drawer must show identical values
2. **Same formatting**: All currency uses `formatFolioMoney()`, all colors use `getBalanceColor()`
3. **Credit handling**: All negative balances labeled "Credit: ₦X" with green color
4. **Status badges**: All use `getFolioStatusVariant()` for consistent styling

### Navigation Consistency

- Child folio "View Folio" → `/dashboard/billing/:folioId`
- Room drawer "View Group Billing" → `/dashboard/group-billing/:groupId`
- Group Billing "Back" → `/dashboard/frontdesk`

## Testing Requirements

### Scenario 1: Simple 3-Room Group

```typescript
// Setup: 3 rooms, ₦10,000 each, no payments
Expected Results:
- Master: Charges ₦30,000, Payments ₦0, Balance ₦30,000
- Each Child: Charges ₦10,000, Payments ₦0, Balance ₦10,000
- All displays consistent across Summary/Cards/Drawer
```

### Scenario 2: Group with Credit (Overpayment)

```typescript
// Setup:
// - Room 1: ₦50,000 charges, ₦80,000 payments = -₦30,000
// - Room 2: ₦50,000 charges, ₦0 payments = ₦50,000
// - Room 3: ₦50,000 charges, ₦50,000 payments = ₦0

Expected Results:
- Master: Charges ₦150,000, Payments ₦130,000, Balance ₦20,000
- Room 1 Card: Shows "Credit Folio" badge, balance displayed as "Credit: ₦30,000.00" in green
- Room 1 Drawer: Matches card exactly
- Breakdown: Room 1 shows "Credit" indicator
```

### Scenario 3: Multi-Tab Sync

```typescript
// Setup: Open Group Billing in Tab A, Room Drawer in Tab B
// Action: Collect payment in Tab B
Expected Results:
- Tab B folio balance updates immediately
- Tab A child folio card updates within 2 seconds (real-time sync)
- Numbers match exactly across tabs
```

## Troubleshooting

### Issue: Numbers don't match between components

**Root Cause:** Component using frontend calculation instead of hook data

**Fix:** Replace calculation with direct hook property:
```typescript
// ❌ Wrong
const balance = booking.total_amount - payments.reduce((s, p) => s + p.amount, 0);

// ✅ Correct
const balance = folio.balance;
```

### Issue: Credit balances show as positive debt

**Root Cause:** Missing `isCredit()` check

**Fix:** Use credit formatting utility:
```typescript
// ❌ Wrong
<span>{formatCurrency(balance)}</span>

// ✅ Correct
<span className={getBalanceColor(balance)}>
  {isCredit(balance) ? getCreditLabel(balance, currency) : formatFolioMoney(balance, currency)}
</span>
```

### Issue: Room drawer shows different values than Group Billing

**Root Cause:** Drawer using `useBookingFolio` with stale data

**Fix:** Ensure real-time invalidation on payment success:
```typescript
queryClient.invalidateQueries({ queryKey: ['booking-folio', bookingId] });
```

## Future Enhancements

1. **Real-time Sync Indicator**: Visual indicator when folio data updates
2. **Audit Trail Integration**: Link from balance display to transaction ledger
3. **Multi-Currency Support**: Extend formatters for non-NGN currencies
4. **Folio Merge/Split UI**: Advanced operations for splitting bills

## Related Documentation

- [Group Billing Engine Fix](./GROUP_BILLING_ENGINE_FIX_V1.md) - Backend architecture
- [Folio System Architecture](./FOLIO_SYSTEM_ARCHITECTURE.md) - Core folio concepts
- [Billing Center QA Checklist](./BILLING_CENTER_QA_CHECKLIST.md) - Testing procedures

---

**Maintained by:** Hospitech Nexus Development Team  
**Questions?** Refer to project memories or consult `src/hooks/useGroupMasterFolio.ts`
