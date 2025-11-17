# Edge Function Deployment Verification Guide

## Critical: Ensure V2.2.1 is Actually Running

This guide ensures the RPC UUID fix deployment is successful and the new code is actually running in production.

---

## Problem

Supabase edge functions can fail to deploy new code if:
1. Build fails silently due to dependency issues
2. Deno cache serves stale builds
3. Mixed import versions cause resolution errors

**Symptom**: You deploy successfully but logs show OLD version markers and code behavior doesn't change.

---

## Solution: Standardized Deployment Process

### Step 1: Pre-Deployment Check

Verify all critical functions use consistent imports:

```bash
# Check for mixed versions
grep -r "@supabase/supabase-js@" supabase/functions/*/index.ts | grep -v "@2.46.1"
```

**Expected**: No output (all use @2.46.1)

---

### Step 2: Clean Build

Force a clean build to clear any cached artifacts:

```bash
# Clean any local caches
rm -rf .deno

# Verify deno.json is clean
cat supabase/functions/deno.json
```

**Expected deno.json**:
```json
{
  "nodeModulesDir": "auto",
  "compilerOptions": {
    "strict": true
  }
}
```

---

### Step 3: Deploy Critical Functions

Deploy in dependency order:

```bash
supabase functions deploy create-payment --project-ref akchmpmzcupzjaeewdui
supabase functions deploy checkin-guest --project-ref akchmpmzcupzjaeewdui
supabase functions deploy complete-checkout --project-ref akchmpmzcupzjaeewdui
supabase functions deploy qr-request --project-ref akchmpmzcupzjaeewdui
supabase functions deploy generate-folio-pdf --project-ref akchmpmzcupzjaeewdui
```

**Watch for**:
- ✅ "Deployed successfully" message
- ❌ Any "Could not find package" errors
- ❌ Any npm: or jsr: resolution errors

---

### Step 4: Verify Deployment Success

**CRITICAL**: Check logs to confirm new code is running:

```bash
supabase functions logs create-payment --project-ref akchmpmzcupzjaeewdui --limit 50
```

**Must see these markers**:
```
🚀 CREATE-PAYMENT-V2.2.1: Function initialized
```

**If you see**:
```
CREATE-PAYMENT-V2.2.0: Function initialized
```
**OR** no version marker → **Deployment failed, old code is running**

---

### Step 5: Test Payment Flow

1. **Create test payment**:
   - Go to Front Desk
   - Open Room 202 (or any checked-in booking)
   - Record payment: ₦10,000, Cash method

2. **Verify in browser console**:
   - ✅ No 500 error
   - ✅ Success toast appears
   - ✅ Balance updates immediately

3. **Check edge function logs**:
```bash
supabase functions logs create-payment --project-ref akchmpmzcupzjaeewdui --limit 20
```

**Must see**:
```
[V2.2.1] RPC CALL: {
  "folioId": "...",
  "paymentId": "...",
  "amount": 10000,
  "types": {
    "folioId": "string",
    "paymentId": "string",
    "amount": "number"
  }
}
✅ [V2.2.1] RPC SUCCESS: ...
```

**Must NOT see**:
```
[V2.2.1] RPC FAILED: invalid input syntax for type uuid
```

---

### Step 6: Database Verification

```sql
-- 1. Check payment was linked to folio
SELECT 
  p.transaction_ref,
  p.amount,
  p.stay_folio_id,
  p.created_at
FROM payments p
WHERE p.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY p.created_at DESC
LIMIT 5;
```

**Expected**: `stay_folio_id` is **NOT NULL**

```sql
-- 2. Verify folio transaction was created
SELECT 
  ft.transaction_type,
  ft.amount,
  ft.reference_id,
  ft.created_at
FROM folio_transactions ft
WHERE ft.created_at > NOW() - INTERVAL '5 minutes'
  AND ft.transaction_type = 'payment'
ORDER BY ft.created_at DESC
LIMIT 5;
```

**Expected**: New payment entry exists

```sql
-- 3. Verify folio balance updated
SELECT 
  sf.id,
  b.booking_reference,
  sf.total_charges,
  sf.total_payments,
  sf.balance,
  sf.updated_at
FROM stay_folios sf
JOIN bookings b ON b.id = sf.booking_id
WHERE sf.status = 'open'
  AND sf.updated_at > NOW() - INTERVAL '10 minutes'
ORDER BY sf.updated_at DESC
LIMIT 5;
```

**Expected**: `total_payments` increased, `balance` decreased

---

### Step 7: UI Verification

✅ **Payment History Tab**: Loads instantly, shows all payments  
✅ **Booking Folio Card**: Balance updates in real-time  
✅ **Generate PDF**: Payments appear in transactions section  
✅ **No infinite spinners**: Payment data displays immediately

---

## Troubleshooting Deployment Failures

### Issue: Old version still running after deployment

**Symptoms**:
- Logs show V2.2.0 or earlier
- RPC errors persist
- Payment linking still fails

**Fix**:
1. Check for dependency resolution errors:
```bash
supabase functions deploy create-payment --debug
```

2. Look for:
   - `Could not find package` errors
   - `npm:` or `jsr:` import errors
   - Mixed version conflicts

3. If found, standardize ALL function imports to @2.46.1

---

### Issue: Build succeeds but behavior unchanged

**Cause**: Supabase serving cached build despite successful deployment

**Fix**:
```bash
# Force new deployment with timestamp
supabase functions deploy create-payment --no-verify-jwt
```

Wait 2-3 minutes for propagation, then check logs again.

---

### Issue: RPC still fails with UUID error

**Symptoms**:
```
invalid input syntax for type uuid: "{"id": "...", ...}"
```

**Cause**: V2.2.1 code not actually running

**Fix**:
1. Verify logs show V2.2.1 marker
2. If not, deployment failed (see above)
3. Check for import version mismatches
4. Redeploy with `--debug` flag to see actual errors

---

## Success Criteria Checklist

- [ ] All functions use `@supabase/supabase-js@2.46.1`
- [ ] No `npm:` or `jsr:` imports in any function
- [ ] `deno.json` contains only `nodeModulesDir: "auto"`
- [ ] Deployment succeeds with no warnings
- [ ] Logs show `CREATE-PAYMENT-V2.2.1: Function initialized`
- [ ] Test payment shows `[V2.2.1] RPC SUCCESS` in logs
- [ ] Database confirms `stay_folio_id` is populated
- [ ] UI loads payment history instantly
- [ ] Folio balances update in real-time
- [ ] PDF generation includes payments
- [ ] No 500 errors in browser console

---

## Emergency Rollback

If V2.2.1 causes issues:

```bash
# Redeploy previous version
git checkout <previous-commit-hash>
supabase functions deploy create-payment --project-ref akchmpmzcupzjaeewdui
```

Then investigate why new version failed.

---

## Post-Deployment Monitoring

Monitor for 24 hours:

```bash
# Watch for any RPC failures
supabase functions logs create-payment --project-ref akchmpmzcupzjaeewdui --limit 200 | grep "RPC FAILED"
```

**Expected**: No output (zero RPC failures)

```bash
# Check payment success rate
supabase functions logs create-payment --project-ref akchmpmzcupzjaeewdui --limit 200 | grep "RPC SUCCESS" | wc -l
```

**Expected**: Matches number of payments recorded

---

## CI Integration

Add to `.github/workflows/verify-edge-functions.yml`:

```yaml
- name: Verify create-payment V2.2.1 deployed
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_PROJECT_REF: akchmpmzcupzjaeewdui
  run: |
    echo "Checking create-payment deployment..."
    LOGS=$(supabase functions logs create-payment --project-ref $SUPABASE_PROJECT_REF --limit 50)
    
    if echo "$LOGS" | grep -q "CREATE-PAYMENT-V2.2.1"; then
      echo "✅ create-payment V2.2.1 is deployed and running"
    else
      echo "❌ ERROR: create-payment V2.2.1 not found in logs"
      echo "Recent logs:"
      echo "$LOGS"
      exit 1
    fi
```

This CI check will fail if old version is running, preventing broken deployments from going unnoticed.
