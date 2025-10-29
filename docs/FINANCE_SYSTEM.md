# Finance System Documentation

## Overview

The Finance System is a comprehensive payment and wallet management solution for the hotel platform. It handles payment processing, provider integration, wallet management, reconciliation, and financial analytics.

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
4. **Wallet assignment** - Optionally assign to a wallet for tracking
5. **Validation** - Provider rules and organization limits checked
6. **Processing** - Payment charged via provider
7. **Recording** - Payment and wallet transactions stored
8. **Audit** - All actions logged for compliance

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

## Usage Examples

### Recording a Payment

```typescript
import { useRecordPayment } from '@/hooks/useRecordPayment';

const { mutate: recordPayment } = useRecordPayment();

recordPayment({
  transaction_ref: 'TXN-123',
  guest_id: 'guest-uuid',
  amount: 25000,
  method: 'pos',
  provider_id: 'moniepoint-uuid',
  location_id: 'frontdesk-uuid',
  wallet_id: 'wallet-uuid',
  metadata: { notes: 'Room payment' }
});
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

### Wallet Operations

```typescript
// Top up a wallet
await supabase.from('wallet_transactions').insert({
  wallet_id: 'wallet-uuid',
  type: 'credit',
  amount: 50000,
  description: 'Deposit',
  created_by: 'user-uuid'
});

// Withdraw from wallet
await supabase.from('wallet_transactions').insert({
  wallet_id: 'wallet-uuid',
  type: 'debit',
  amount: 10000,
  description: 'Service charge',
  created_by: 'user-uuid'
});
```

## Database Schema

### Key Tables

- `finance_providers` - Payment provider configurations
- `finance_locations` - Point of sale locations
- `finance_provider_rules` - Provider behavior rules
- `wallets` - Wallet balances and metadata
- `wallet_transactions` - All wallet movements
- `payments` - Payment records
- `organizations` - Corporate clients
- `organization_wallet_rules` - Organization spending limits
- `finance_reconciliation_records` - Provider statement matching
- `finance_analytics_snapshots` - Pre-computed analytics

### Triggers

- `update_wallet_balance` - Automatically updates wallet balance on transaction
- `log_config_change` - Audits all configuration changes

### Functions

- `validate_org_limits` - Validates organization spending rules
- `update_wallet_balance()` - Updates wallet balances on transactions

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

## Future Enhancements

- Integration with real payment gateways (Paystack, Flutterwave)
- Multi-currency support
- Scheduled reconciliation jobs
- Advanced fraud detection
- Mobile app integration
- Receipt generation and email delivery
- Tax calculation and reporting
- Budget management and forecasting
