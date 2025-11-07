# SMS Automation Setup Guide

This guide explains how to set up automated SMS notifications for your hotel, including check-in reminders, checkout confirmations, and payment notifications.

## Table of Contents
1. [Overview](#overview)
2. [SMS Features](#sms-features)
3. [Automated Check-In Reminders](#automated-check-in-reminders)
4. [Manual SMS Reminders](#manual-sms-reminders)
5. [SMS Settings](#sms-settings)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The SMS notification system supports:
- ✅ **Automatic check-in reminders** (24 hours before arrival)
- ✅ **Automatic checkout confirmations** (when guest checks out)
- ✅ **Payment receipts** (optional toggle during payment)
- ✅ **Manual payment reminders** (for receivables/debts)
- ✅ **Bulk reminder sending** (for multiple overdue accounts)

---

## SMS Features

### 1. Check-In Confirmation (Automatic)
- **Trigger**: When front desk staff checks in a guest
- **When**: Immediately upon check-in
- **Message**: "Hi [Guest Name], welcome to [Hotel Name]! You're checked into Room [Number]. Enjoy your stay!"
- **Setting**: Controlled by "Auto-send Check-In Confirmation" in SMS Settings

### 2. Checkout Confirmation (Automatic)
- **Trigger**: When front desk staff checks out a guest
- **When**: Immediately upon checkout
- **Message**: "Thank you for staying at [Hotel Name]! We hope you enjoyed your stay in Room [Number]. Safe travels!"
- **Setting**: Controlled by "Auto-send Checkout Confirmation" in SMS Settings

### 3. Check-In Reminder (Automated - Requires Cron Setup)
- **Trigger**: Scheduled automation
- **When**: 24 hours before guest's check-in time
- **Message**: "Hi [Guest Name], reminder: Your check-in at [Hotel Name] is tomorrow ([Date]). Room [Number] will be ready. See you soon!"
- **Setting**: Controlled by "Auto-send Check-In Reminder" in SMS Settings
- **Requires**: Cron job setup (see below)

### 4. Payment Receipt (Manual Toggle)
- **Trigger**: When staff records a payment
- **When**: Only if "Send SMS Receipt" toggle is enabled in payment form
- **Message**: "Payment received: ₦[Amount] via [Method]. Ref: [Transaction Ref]. Thank you! - [Hotel Name]"
- **Setting**: Per-payment toggle in Payment Form

### 5. Payment Reminder (Manual)
- **Trigger**: Staff clicks "Send Reminder" button
- **Where**: 
  - Receivables Tab (individual or bulk)
  - Room Action Drawer (payment section)
- **Message**: "Hi [Guest Name], gentle reminder: You have an outstanding balance of ₦[Amount]. Please contact us to settle. - [Hotel Name]"
- **Setting**: Available when guest has outstanding balance

---

## Automated Check-In Reminders

The check-in reminder feature requires setting up a scheduled job (cron) that runs daily to send reminders to guests arriving in 24 hours.

### Option 1: Supabase pg_cron (Recommended)

**Step 1**: Enable pg_cron extension in your Supabase project:
```sql
-- Run in SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**Step 2**: Schedule the daily cron job:
```sql
SELECT cron.schedule(
  'send-checkin-reminders',
  '0 10 * * *', -- Daily at 10:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://akchmpmzcupzjaeewdui.supabase.co/functions/v1/send-checkin-reminder',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4"}'::jsonb,
      body := jsonb_build_object(
        'tenant_id', '[YOUR-TENANT-ID]',
        'hours_before', 24
      )
    ) as request_id;
  $$
);
```

**Important Notes**:
- Replace `[YOUR-TENANT-ID]` with your actual tenant ID
- Adjust the time zone in cron schedule as needed (e.g., `0 10 * * *` = 10 AM UTC)
- The function will only send reminders if enabled in SMS Settings

**To check scheduled jobs**:
```sql
SELECT * FROM cron.job;
```

**To remove the scheduled job**:
```sql
SELECT cron.unschedule('send-checkin-reminders');
```

---

### Option 2: External Cron Service

If you prefer using an external service like [cron-job.org](https://cron-job.org) or similar:

**Endpoint**: `https://akchmpmzcupzjaeewdui.supabase.co/functions/v1/send-checkin-reminder`

**Method**: POST

**Headers**:
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4
```

**Body**:
```json
{
  "tenant_id": "[YOUR-TENANT-ID]",
  "hours_before": 24
}
```

**Schedule**: Daily at 10:00 AM (adjust to your timezone)

**Expected Response**:
```json
{
  "success": true,
  "sent": 5,
  "failed": 0,
  "total": 5
}
```

---

## Manual SMS Reminders

### From Receivables Tab (Finance Center)

**Individual Reminders**:
1. Navigate to Finance Center → Receivables tab
2. Find the guest/organization with outstanding balance
3. Click "Send Reminder" button
4. SMS sent immediately

**Bulk Reminders**:
1. Navigate to Finance Center → Receivables tab
2. Click "Send Bulk Reminders" button (appears if overdue accounts exist)
3. Confirm the count
4. System sends reminders with 500ms delay between each
5. Progress toast shows "Sending X/Y reminders..."
6. Final summary: "X reminders sent, Y failed"

### From Room Action Drawer (Front Desk)

1. Click on an occupied room with outstanding balance
2. In the drawer, scroll to Payment section
3. If balance > 0 and guest has phone, "Send Payment Reminder" button appears
4. Click to send immediate reminder

---

## SMS Settings

**Location**: Settings → SMS & Communications

**Available Toggles**:
- ☑️ **Enable SMS Notifications** - Master toggle for all SMS
- ☑️ **Auto-send Check-In Confirmation** - SMS when guest checks in
- ☑️ **Auto-send Checkout Confirmation** - SMS when guest checks out
- ☑️ **Auto-send Check-In Reminder** - Daily automation 24h before arrival
- ☑️ **Auto-send Payment Confirmation** - SMS for payment receipts (optional per-payment)

**SMS Credits**:
- View remaining credits in SMS Activity Widget (Finance Dashboard)
- Credits are deducted per message segment (160 characters = 1 credit)
- Purchase more credits from SMS marketplace when running low

**SMS Templates**:
- Templates are hard-coded but use dynamic variables:
  - `[Guest Name]`, `[Hotel Name]`, `[Room Number]`, `[Amount]`, etc.
- Future updates will allow custom template editing

---

## Troubleshooting

### SMS Not Sending

**Checklist**:
1. ✅ Is "Enable SMS Notifications" turned ON in Settings?
2. ✅ Is the specific event toggle (check-in, checkout, reminder) enabled?
3. ✅ Does the guest have a valid phone number?
4. ✅ Do you have sufficient SMS credits?
5. ✅ Is the SMS provider configured correctly?

**Check SMS Logs**:
- Navigate to Finance Center → SMS Activity Widget
- View recent SMS activity with status (sent/failed)
- Check error messages for failed sends

### Check-In Reminders Not Working

**Verify Automation**:
```sql
-- Check if cron job is scheduled
SELECT * FROM cron.job WHERE jobname = 'send-checkin-reminders';
```

**Test Manually**:
1. Use Supabase Dashboard → Edge Functions
2. Navigate to `send-checkin-reminder` function
3. Click "Invoke" with test payload:
```json
{
  "tenant_id": "YOUR-TENANT-ID",
  "hours_before": 24
}
```
4. Check response and logs

**Common Issues**:
- ❌ Cron job not scheduled → Follow setup steps above
- ❌ Auto-send toggle disabled → Enable in SMS Settings
- ❌ No bookings with check-in in 24 hours → Nothing to send
- ❌ Guests missing phone numbers → Update guest records

### Duplicate SMS Sends

**Fixed in Latest Version**: 
- Old duplicate issue (frontend + backend both sending) has been resolved
- Only edge functions send SMS now
- If you still see duplicates, check your version

### SMS Credits Depleted

**Purchase More Credits**:
1. Navigate to Marketplace → SMS Bundles
2. Select appropriate bundle
3. Complete purchase
4. Credits added immediately

**Monitor Usage**:
- SMS Activity Widget shows daily usage
- Set up low-credit alerts (coming soon)

---

## SMS Logging & Audit Trail

All SMS sends are logged to:
- `tenant_sms_usage_logs` table (detailed logs)
- `platform_audit_stream` table (audit trail)

**Log Information Includes**:
- Recipient phone number
- Message preview (first 100 chars)
- Event type (check-in, checkout, reminder, etc.)
- Status (sent/failed)
- Credits consumed
- Timestamp
- Error messages (if failed)
- Associated booking/guest ID

**View Logs**:
- SMS Activity Widget (recent 10)
- Full logs available via SQL query or custom report

---

## Best Practices

1. **Test Before Enabling**: Send test SMS to yourself first
2. **Monitor Credits**: Keep track of usage to avoid running out
3. **Guest Consent**: Ensure guests consent to receiving SMS notifications
4. **Timing**: Schedule check-in reminders for appropriate local time (10 AM recommended)
5. **Review Failures**: Check failed SMS logs regularly and fix phone number issues
6. **Don't Spam**: Use manual reminders sparingly, not for every small balance

---

## Support

For issues or questions:
- Check logs in SMS Activity Widget
- Review error messages
- Contact system administrator
- Raise support ticket with Lovable platform

---

**Last Updated**: November 7, 2025  
**Version**: 1.0
