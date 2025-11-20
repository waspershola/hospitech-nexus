# Phase 6: GROUP-MASTER-V5 Testing Checklist

## ✅ Pre-Test Setup (COMPLETE)
- [x] `post_group_master_charge` RPC deployed
- [x] `create-booking` edge function updated with GROUP-MASTER-V5
- [x] Edge function deployed to Supabase Cloud
- [x] React Query invalidation added

## 🧪 Test Procedure

### Step 1: Create Test Group Booking
1. Log in to the system
2. Navigate to **Front Desk** → **New Booking**
3. Enable **Group Booking** toggle
4. Fill in group details:
   - Group Name: `Test Group Phase 6`
   - Group Size: 2 rooms
   - Select 2 available rooms
   - Check-in: Tomorrow
   - Check-out: +2 days
5. Submit booking

### Step 2: Verify Edge Function Logs
Check logs immediately after booking creation:
```
Expected log entries:
- [GROUP-MASTER-V5] Processing group booking
- [GROUP-MASTER-V5] Master folio found/created
- [GROUP-MASTER-V5] Calling post_group_master_charge RPC
- [GROUP-MASTER-V5] Charge posted successfully
```

### Step 3: Verify Database State

**Check master folio created:**
```sql
SELECT 
  id, folio_number, folio_type, status,
  total_charges, balance,
  metadata->>'group_id' as group_id
FROM stay_folios
WHERE folio_type = 'group_master'
  AND metadata->>'group_id' = '[NEW_GROUP_ID]'
  AND tenant_id = '[YOUR_TENANT_ID]';
```

**Check charge posted:**
```sql
SELECT 
  ft.id, ft.description, ft.amount, ft.transaction_type,
  ft.created_at, ft.folio_id
FROM folio_transactions ft
JOIN stay_folios sf ON sf.id = ft.folio_id
WHERE sf.folio_type = 'group_master'
  AND sf.metadata->>'group_id' = '[NEW_GROUP_ID]'
  AND ft.tenant_id = '[YOUR_TENANT_ID]'
ORDER BY ft.created_at DESC;
```

### Step 4: Verify UI Display
1. Navigate to **Group Billing Center** using the group_id
2. Verify:
   - ✅ Master folio displays with correct balance
   - ✅ Charge transaction appears in ledger
   - ✅ No "No master folio found" errors
   - ✅ Real-time balance updates work

## 🎯 Success Criteria
- [ ] Edge function logs show GROUP-MASTER-V5 execution
- [ ] Master folio created with `folio_type = 'group_master'`
- [ ] Charge posted: `total_charges > 0`, `balance > 0`
- [ ] Group Billing Center loads without errors
- [ ] Transaction visible in folio ledger
- [ ] No "invalid input syntax for type uuid" errors

## 🚨 If Test Fails

### Issue: No GROUP-MASTER-V5 logs
- Check edge function deployment status
- Verify group booking fields extracted in request body

### Issue: Master folio created but balance = 0
- Check `post_group_master_charge` RPC execution
- Verify `folio_post_charge` is being called
- Check tenant_id filtering

### Issue: "No master folio found" in UI
- Verify `group_id` matches between `group_bookings` and `stay_folios.metadata`
- Check `useGroupMasterFolio` hook query

## 📊 Current State (Pre-Test)
- 13 existing group bookings with zero charges
- Latest booking (f8048bb0) has no master folio
- Need verification via new test booking

---

**Next Steps After Phase 6:**
- Phase 7: Backfill existing group master folios
- Phase 8: UI polish and real-time sync
- Phase 9: Documentation and automated tests
- Phase 10: Production rollout
