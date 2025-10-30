# Finance System Documentation

## Overview

The Finance System is a comprehensive payment, wallet, and receivables management solution for the hotel platform. It handles payment processing, provider integration, wallet management, accounts receivable tracking, reconciliation, and financial analytics with built-in manager approval workflows.

## Architecture

### Core Components

1. **Payment Providers** (`src/lib/finance/providers/`)
   - Pluggable payment provider system
   - Support for POS, online, transfer, and cash methods
   - Standardized interface for all providers
   
2. **Wallets** (`src/modules/wallets/`)
   - Multi-wallet support (guest, department, organization)
   - Real-time balance tracking
   - Transaction history
   
3. **Finance Center** (`src/pages/dashboard/FinanceCenter.tsx`)
   - Central hub for all financial operations
   - Tabs for providers, locations, rules, wallets, organizations, reconciliation, and analytics

4. **Payment Processing** (`supabase/functions/create-payment/`)
   - Edge function for secure payment processing
   - Provider rule validation
   - Organization limit enforcement
   - Automatic wallet transactions
   - Overpayment/underpayment handling
   - Manager approval for large amounts
   - Receivables creation for partial payments

5. **Receivables Management** (`src/modules/finance-center/ReceivablesTab.tsx`)
   - Dedicated accounts receivable tracking
   - AR aging analysis
   - Payment status management
   - Write-off and escalation workflows

6. **Force Checkout** (`supabase/functions/force-checkout/`)
   - Manager-approved checkout with outstanding balance
   - Automatic receivable creation
   - Complete audit trail

## Key Features

### Payment Providers

Available providers:
- **Moniepoint** - POS terminal integration
- **Opay** - Mobile POS
- **Zenith** - Bank POS
- **Bank Transfer** - Manual transfer verification
- **Cash** - Instant cash payments

Each provider implements:
```typescript
interface PaymentProvider {
  id: string;
  name: string;
  type: 'pos' | 'online' | 'transfer' | 'cash';
  charge(payload: PaymentPayload): Promise<PaymentResponse>;
  reconcile?(reference: string): Promise<boolean>;
  fetchTransactions?(dateRange: { start: Date; end: Date }): Promise<any[]>;
}
```

### Payment Flow

1. **User initiates payment** - Via booking, front desk, or direct payment entry
2. **Location selection** - Choose where the payment is being made
3. **Provider selection** - Auto-selected based on location or manually chosen
4. **Amount validation** - Check if amount matches expected amount
5. **Overpayment handling** - If overpaid, prompt for wallet credit or refund
6. **Underpayment handling** - If underpaid, create receivable entry
7. **Manager approval** - Required for amounts exceeding configured thresholds
8. **Wallet assignment** - Optionally assign to a wallet for tracking
9. **Validation** - Provider rules and organization limits checked
10. **Processing** - Payment charged via provider
11. **Recording** - Payment, wallet transactions, and receivables stored
12. **Audit** - All actions logged for compliance

### Wallets

Three wallet types:
- **Guest Wallets** - For individual guest deposits and prepayments
- **Department Wallets** - For tracking departmental cash flow
- **Organization Wallets** - For corporate billing and credit management

Operations:
- **Top Up** - Add funds
- **Withdraw** - Remove funds
- **Transfer** - Move funds between wallets
- **Adjust** - Manual balance adjustments with reason

### Finance Locations

Locations represent physical points of sale:
- Front desk
- Restaurant
- Bar
- Spa
- Room service

Each location can have:
- Associated wallet for float management
- Default payment provider
- Custom provider rules

### Provider Rules

Control payment processing behavior:
- **Maximum transaction limits** - Per transaction caps
- **Auto-reconciliation** - Automatic matching of provider statements
- **Department restrictions** - Limit providers by department
- **Location assignments** - Provider availability per location

### Organization Wallet Rules

For corporate clients:
- **Per-guest limits** - Maximum spending per guest (daily/weekly/monthly)
- **Total limits** - Overall organization spending caps
- **Department limits** - Restrict spending by department
- **Negative balance allowance** - Credit facility configuration

### Reconciliation

Automated reconciliation features:
- **Import provider statements** - CSV upload support
- **Auto-matching** - Smart matching of transactions
- **Discrepancy detection** - Identify mismatches
- **Manual adjustment** - Handle special cases
- **Audit trail** - Complete history of reconciliation actions

### Analytics

Real-time financial insights:
- **Revenue Trends** - Daily/weekly/monthly revenue charts
- **Payment Method Stats** - Breakdown by payment method
- **Department Overview** - Revenue by department
- **Discrepancy Heatmap** - Visual reconciliation status
- **Wallet Flow** - Track wallet transaction patterns
- **AR Aging Analysis** - Receivables aging buckets (0-7, 8-30, 31-60, 60+ days)
- **Credit Balance Report** - Guests/orgs with wallet credits

### Payment Preferences

Configurable payment behavior:
- **Checkout with Debt** - Allow/prevent checkout with outstanding balance
- **Auto-Apply Wallet** - Automatically suggest wallet credit on bookings
- **Overpayment Action** - Default to wallet credit, prompt, or refund
- **Manager Thresholds** - Configure amounts requiring approval
- **AR Aging Alerts** - Set days for receivable escalation

## Usage Examples

### Recording a Payment with Overpayment Handling

```typescript
import { useRecordPayment } from '@/hooks/useRecordPayment';

const { mutate: recordPayment } = useRecordPayment();

// Record payment with expected amount for overpayment/underpayment handling
recordPayment({
  transaction_ref: 'TXN-123',
  guest_id: 'guest-uuid',
  amount: 30000, // Amount paid
  expected_amount: 25000, // Expected amount
  overpayment_action: 'wallet', // 'wallet' | 'refund'
  method: 'pos',
  provider_id: 'moniepoint-uuid',
  location_id: 'frontdesk-uuid',
  metadata: { notes: 'Room payment' }
});
// Result: ₦5,000 credited to guest wallet automatically
```

### Creating a Wallet

```typescript
import { useWallets } from '@/hooks/useWallets';

const { createWallet } = useWallets();

createWallet({
  wallet_type: 'guest',
  owner_id: 'guest-uuid',
  name: 'John Doe Wallet',
  currency: 'NGN'
});
```

### Force Checkout with Outstanding Balance

```typescript
import { useForceCheckout } from '@/hooks/useForceCheckout';

const { mutate: forceCheckout } = useForceCheckout();

// Manager-approved checkout with debt
forceCheckout({
  bookingId: 'booking-uuid',
  reason: 'Guest emergency - approved to leave with outstanding balance',
  createReceivable: true
});
// Creates receivable entry and audit log
```

### Apply Wallet Credit to Booking

```typescript
import { useApplyWalletCredit } from '@/hooks/useApplyWalletCredit';

const { mutate: applyCredit } = useApplyWalletCredit();

applyCredit({
  guestId: 'guest-uuid',
  bookingId: 'booking-uuid',
  amountToApply: 10000 // Optional, defaults to full wallet balance
});
// Debits guest wallet and creates payment record
```

## Database Schema

### Key Tables

- `finance_providers` - Payment provider configurations
- `finance_locations` - Point of sale locations
- `finance_provider_rules` - Provider behavior rules
- `wallets` - Wallet balances and metadata
- `wallet_transactions` - All wallet movements (with balance_after and source)
- `payments` - Payment records
- `organizations` - Corporate clients
- `organization_wallet_rules` - Organization spending limits
- `finance_reconciliation_records` - Provider statement matching
- `finance_analytics_snapshots` - Pre-computed analytics
- `receivables` - Accounts receivable tracking
- `hotel_payment_preferences` - Payment behavior configuration
- `finance_audit_events` - Financial operation audit trail

### Triggers

- `update_wallet_balance` - Automatically updates wallet balance on transaction
- `log_config_change` - Audits all configuration changes
- `receivable_audit_trigger` - Logs all receivable status changes
- `update_receivables_updated_at` - Auto-update timestamp on changes

### Functions

- `validate_org_limits` - Validates organization spending rules
- `update_wallet_balance()` - Updates wallet balances on transactions
- `log_receivable_change()` - Audit trigger for receivables

### Edge Functions

- `create-payment` - Process payments with overpayment/underpayment handling
- `force-checkout` - Manager-approved checkout with outstanding balance
- `apply-wallet-credit` - Apply guest wallet balance to bookings
- `complete-checkout` - Standard checkout with balance validation

## Security

- **Row Level Security (RLS)** - All tables secured by tenant
- **Audit logging** - All financial operations logged
- **Provider credentials** - Encrypted storage of API keys
- **Transaction idempotency** - Prevents duplicate charges
- **Limit enforcement** - Server-side validation of all limits

## Error Handling

All financial components wrapped in ErrorBoundary:
- Graceful degradation on errors
- User-friendly error messages
- Detailed logging for debugging
- Retry mechanisms for transient failures

## Testing

Test payment providers in development:
- All providers simulate real behavior
- Configurable success/failure rates
- Realistic timing and responses

## Manager Approval Workflow

Large transactions require manager approval:

1. **Detection** - System checks if amount exceeds configured thresholds
2. **Blocking** - Payment/checkout blocked until approval
3. **Manager Modal** - Manager enters PIN and reason for approval
4. **Validation** - System validates manager role and credentials
5. **Execution** - Transaction proceeds with `force_approve` flag
6. **Audit** - Approval logged in `finance_audit_events`

Configurable thresholds:
- `manager_approval_threshold` - For underpayments (partial payments)
- `large_overpayment_threshold` - For overpayments

## Receivables (AR) Management

Complete accounts receivable tracking:

**Features:**
- Automatic creation on underpayments
- AR aging analysis (0-7, 8-30, 31-60, 60+ days)
- Status tracking (open, paid, written_off, escalated)
- Manual actions (mark paid, escalate, write-off)
- Integration with booking folio display

**Workflows:**
1. **Underpayment** → Creates receivable + booking_charges entry
2. **Force Checkout** → Creates receivable for outstanding balance
3. **Aging Alert** → Flags receivables older than configured days
4. **Payment** → Marks receivable as paid

## Wallet Credit Features

**Overpayment Handling:**
- Choice dialog: Credit to wallet vs. Process refund
- Default action configurable in preferences
- Automatic wallet transaction creation
- Manager approval for large amounts

**Booking Application:**
- Show available balance during booking
- Optional auto-apply of wallet credit
- Creates payment record linked to booking
- Updates wallet balance in real-time

**Credit Management:**
- View all wallets with positive balances
- Filter by guest/organization/department
- Track last transaction date
- Monitor total credits liability

## Future Enhancements

- Integration with real payment gateways (Paystack, Flutterwave)
- Multi-currency support
- Scheduled reconciliation jobs
- Advanced fraud detection
- Mobile app integration
- Receipt generation and email delivery
- Tax calculation and reporting
- Budget management and forecasting
- Automated AR collection reminders
- Credit limit management for organizations
- Wallet expiry dates and policies
