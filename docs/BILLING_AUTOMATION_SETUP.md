# Billing Automation Setup Guide

## Overview

The platform includes automated billing cycle processing that generates invoices for all active tenants on a monthly basis.

## Components

### 1. Edge Function: `process-billing-cycle`

Located at: `supabase/functions/process-billing-cycle/index.ts`

**What it does:**
- Fetches all active tenants with their subscription plans
- Retrieves usage data for the current billing period
- Calculates base subscription fees and overage charges
- Generates invoices with detailed line items
- Logs all billing events to audit stream

**How to trigger manually:**
```typescript
const { data } = await supabase.functions.invoke('process-billing-cycle', {
  method: 'POST'
});
```

### 2. Automated Scheduling (Cron Job)

To run the billing cycle automatically on the 1st of each month, set up a Supabase cron job:

#### Step 1: Enable Extensions

In Supabase SQL Editor, run:
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

#### Step 2: Create Cron Job

```sql
-- Schedule billing cycle to run on 1st of each month at 2 AM
SELECT cron.schedule(
  'monthly-billing-cycle',
  '0 2 1 * *',  -- At 2:00 AM on day 1 of every month
  $$
  SELECT net.http_post(
    url := 'https://akchmpmzcupzjaeewdui.supabase.co/functions/v1/process-billing-cycle',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

#### Step 3: Verify Cron Job

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- Check cron job history
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'monthly-billing-cycle')
ORDER BY start_time DESC 
LIMIT 10;
```

## Billing Calculation Logic

### Base Subscription Fee
- Charged from the tenant's assigned plan (`platform_plans.monthly_price`)
- Applied to all active tenants regardless of usage

### SMS Overage
- Included SMS: Defined in `platform_plans.included_sms`
- Overage Rate: ₦5 per SMS beyond included amount
- Formula: `(sms_used - included_sms) × 5` if `sms_used > included_sms`

### Total Invoice Amount
```
Total = Base Subscription Fee + SMS Overage Cost
```

## Invoice Structure

Each invoice (`platform_billing` table) contains:

```typescript
{
  tenant_id: string,
  cycle_start: timestamp,
  cycle_end: timestamp,
  amount_due: number,
  amount_paid: number,
  status: 'pending' | 'paid' | 'overdue' | 'cancelled',
  sms_used: number,
  invoice_payload: {
    base_amount: number,
    sms_included: number,
    sms_used: number,
    sms_overage: number,
    sms_overage_cost: number,
    rooms_total: number,
    bookings_monthly: number,
    api_calls: number,
    line_items: [
      {
        description: string,
        quantity: number,
        unit_price: number,
        amount: number
      }
    ]
  }
}
```

## UI Management

### Platform Billing Tab

Access: Platform Dashboard → Billing

**Features:**
- View all invoices across tenants
- Revenue summary (total, paid, pending)
- Manual billing cycle trigger
- Invoice status management
- Detailed line item breakdown

**Actions:**
- **Process Billing Cycle**: Manually trigger billing for current period
- **Update Invoice Status**: Change status (pending → paid/overdue/cancelled)

## Monitoring & Audit

All billing events are logged to `platform_audit_stream`:

```sql
-- View recent billing events
SELECT * FROM platform_audit_stream
WHERE resource_type = 'platform_billing'
ORDER BY created_at DESC
LIMIT 50;
```

## Future Enhancements

- [ ] Email notifications to tenant admins
- [ ] Automated payment collection integration
- [ ] Dunning management (overdue invoice handling)
- [ ] Custom billing periods (annual, quarterly)
- [ ] Multi-currency support
- [ ] Prorated charges for mid-cycle plan changes
- [ ] Invoice PDF generation
- [ ] Tenant self-service billing portal

## Troubleshooting

### Cron Job Not Running

1. Check if extensions are enabled:
```sql
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

2. Verify cron job exists:
```sql
SELECT * FROM cron.job WHERE jobname = 'monthly-billing-cycle';
```

3. Check execution logs:
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Duplicate Invoices

The function includes duplicate detection:
```typescript
// Checks for existing invoice with same cycle dates
if (existingInvoice) {
  console.log('Invoice already exists, skipping');
  continue;
}
```

### Missing Usage Data

If `platform_usage` has no records for a tenant during the billing period:
- The function skips invoice generation for that tenant
- Check if `track-usage` edge function is being called properly

## Testing

### Manual Test

1. Go to Platform Dashboard → Billing
2. Click "Process Billing Cycle"
3. Verify invoices are generated
4. Check console logs for detailed execution trace

### Test Cron Job

Temporarily change schedule to run every minute:
```sql
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'monthly-billing-cycle'),
  schedule := '* * * * *'
);
```

Remember to change it back to monthly after testing!

## Support

For billing-related issues:
1. Check edge function logs: [Process Billing Cycle Logs](https://supabase.com/dashboard/project/akchmpmzcupzjaeewdui/functions/process-billing-cycle/logs)
2. Review audit stream events
3. Verify tenant plan assignments
4. Confirm usage tracking is functioning
