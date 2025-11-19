# Group Booking System - Testing & Verification Guide
Version: GROUP-TEST-V1

## Phase 5: Complete Testing Checklist

### 1. Database Foundation Tests

#### Test 1.1: Verify group_bookings table structure
```sql
-- Should return group_bookings table with all required columns
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'group_bookings'
ORDER BY ordinal_position;
```

#### Test 1.2: Verify RLS policies on group_bookings
```sql
-- Should show 4 RLS policies (select, insert, update, delete)
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'group_bookings';
```

#### Test 1.3: Check existing group bookings
```sql
-- Should return 28 backfilled group bookings with master folios
SELECT 
  gb.id,
  gb.group_id,
  gb.group_name,
  gb.group_leader,
  gb.group_size,
  gb.status,
  gb.master_booking_id,
  gb.master_folio_id,
  sf.folio_number as master_folio_number,
  sf.folio_type,
  COUNT(DISTINCT b.id) as booking_count
FROM group_bookings gb
LEFT JOIN stay_folios sf ON sf.id = gb.master_folio_id
LEFT JOIN bookings b ON b.metadata->>'group_id' = gb.group_id::text
WHERE gb.tenant_id = current_user_tenant()
GROUP BY gb.id, sf.folio_number, sf.folio_type
ORDER BY gb.created_at DESC;
```

### 2. RPC Function Tests

#### Test 2.1: Test create_group_master_folio RPC
```sql
-- Should create a new group master folio (idempotent - safe to run multiple times)
SELECT create_group_master_folio(
  p_tenant_id := current_user_tenant(),
  p_group_id := '550e8400-e29b-41d4-a716-446655440000'::uuid,
  p_master_booking_id := (
    SELECT id FROM bookings 
    WHERE metadata->>'group_id' = '550e8400-e29b-41d4-a716-446655440000'
    LIMIT 1
  ),
  p_guest_id := (
    SELECT guest_id FROM bookings 
    WHERE metadata->>'group_id' = '550e8400-e29b-41d4-a716-446655440000'
    LIMIT 1
  ),
  p_group_name := 'Test Corporate Group'
);

-- Verify the created folio
SELECT * FROM stay_folios 
WHERE folio_type = 'group_master' 
  AND booking_id IN (
    SELECT id FROM bookings 
    WHERE metadata->>'group_id' = '550e8400-e29b-41d4-a716-446655440000'
  );
```

#### Test 2.2: Test get_group_master_folio RPC
```sql
-- Should return master folio with aggregated balances and child folios
SELECT * FROM get_group_master_folio(
  p_tenant_id := current_user_tenant(),
  p_group_id := (SELECT group_id FROM group_bookings LIMIT 1)
);
```

#### Test 2.3: Test close_child_folio_to_master RPC
```sql
-- Should transfer child folio balance to master and close child
SELECT close_child_folio_to_master(
  p_tenant_id := current_user_tenant(),
  p_child_folio_id := (
    SELECT id FROM stay_folios 
    WHERE folio_type = 'room' 
      AND parent_folio_id IS NOT NULL 
      AND status = 'open'
    LIMIT 1
  )
);
```

### 3. Trigger Tests

#### Test 3.1: Test auto-update group_size trigger
```sql
-- Get initial group size
SELECT group_id, group_size FROM group_bookings WHERE group_id = (SELECT group_id FROM group_bookings LIMIT 1);

-- Insert a new booking to the group (update group_size in same query to verify)
-- This should automatically increment group_size via trigger

-- Verify updated group_size
SELECT group_id, group_size FROM group_bookings WHERE group_id = (SELECT group_id FROM group_bookings LIMIT 1);
```

#### Test 3.2: Test validate_group_master_folio trigger
```sql
-- This should FAIL with error: "Group master folios cannot have a parent folio"
INSERT INTO stay_folios (
  tenant_id, booking_id, guest_id, folio_type, parent_folio_id
) VALUES (
  current_user_tenant(),
  (SELECT id FROM bookings LIMIT 1),
  (SELECT guest_id FROM bookings LIMIT 1),
  'group_master',
  '550e8400-e29b-41d4-a716-446655440000'::uuid
);
-- Expected: ERROR: Group master folios cannot have a parent folio
```

#### Test 3.3: Test sync_group_booking_status trigger
```sql
-- Get initial status
SELECT group_id, status FROM group_bookings LIMIT 1;

-- Update all bookings in group to 'checked_in'
UPDATE bookings 
SET status = 'checked_in'
WHERE metadata->>'group_id' = (SELECT group_id::text FROM group_bookings LIMIT 1);

-- Verify status changed to 'in_house'
SELECT group_id, status FROM group_bookings LIMIT 1;
-- Expected: status = 'in_house'
```

#### Test 3.4: Test prevent_master_folio_deletion trigger
```sql
-- This should FAIL with error about open child folios
DELETE FROM stay_folios 
WHERE id = (
  SELECT master_folio_id FROM group_bookings 
  WHERE master_folio_id IS NOT NULL LIMIT 1
);
-- Expected: ERROR: Cannot delete group master folio with N open child folios
```

### 4. Edge Function Integration Tests

#### Test 4.1: Test create-booking edge function (GROUP-MASTER-V1)
**Manual Test via UI:**
1. Navigate to booking flow
2. Enable "Group Booking" toggle
3. Fill in group details (name, leader, size)
4. Select multiple rooms
5. Complete booking

**Expected Results:**
- First booking creates group_bookings record
- Master folio created with GMF-prefix
- group_bookings.master_booking_id set to first booking
- group_bookings.master_folio_id linked to master folio
- Subsequent bookings in same group do NOT create duplicate master folios

**Verification Query:**
```sql
-- Check edge function logs for GROUP-MASTER-V1 markers
-- Verify group_bookings record created
SELECT * FROM group_bookings ORDER BY created_at DESC LIMIT 1;

-- Verify master folio created
SELECT * FROM stay_folios WHERE folio_type = 'group_master' ORDER BY created_at DESC LIMIT 1;
```

#### Test 4.2: Test checkin-guest edge function (GROUP-CHECKIN-V1)
**Manual Test via UI:**
1. Find a group booking in reserved status
2. Check in the guest
3. Verify folio created and linked to master

**Expected Results:**
- Room folio created for guest
- parent_folio_id set to group master folio
- Edge function logs show GROUP-CHECKIN-V1 markers

**Verification Query:**
```sql
-- Verify child folio linked to master
SELECT 
  sf.id,
  sf.folio_number,
  sf.folio_type,
  sf.parent_folio_id,
  sf_master.folio_number as master_folio_number
FROM stay_folios sf
LEFT JOIN stay_folios sf_master ON sf_master.id = sf.parent_folio_id
WHERE sf.folio_type = 'room' 
  AND sf.parent_folio_id IS NOT NULL
ORDER BY sf.created_at DESC
LIMIT 5;
```

### 5. Frontend Integration Tests

#### Test 5.1: Test useGroupMasterFolio hook
**Manual Test:**
1. Navigate to `/dashboard/group-billing/:groupId`
2. Verify page loads without errors
3. Check console for successful RPC call with correct parameters

**Expected Results:**
- Hook calls `get_group_master_folio` with `p_group_id` parameter
- Data loads showing master folio, child folios, aggregated balances
- Real-time subscriptions active (check for subscription logs)

#### Test 5.2: Test GroupBillingCenter page
**Manual Test:**
1. Navigate to group billing center
2. Verify all components render:
   - Master folio summary
   - Child folio cards
   - Aggregated balance display
   - Transaction history tabs

**Expected Results:**
- All data displays correctly
- Real-time updates work (test by making payment in another tab)
- PDF/Email/Print buttons functional

#### Test 5.3: Test booking flow navigation
**Manual Test:**
1. Complete a group booking
2. After confirmation, verify navigation to Group Billing Center

**Expected Results:**
- Redirects to `/dashboard/group-billing/:groupId`
- Group ID passed correctly via URL
- Page loads with newly created group data

### 6. Data Integrity Tests

#### Test 6.1: Verify no orphaned child folios
```sql
-- Should return 0 rows
SELECT 
  sf.id,
  sf.folio_number,
  sf.parent_folio_id
FROM stay_folios sf
WHERE sf.folio_type = 'room' 
  AND sf.parent_folio_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM stay_folios master 
    WHERE master.id = sf.parent_folio_id 
      AND master.folio_type = 'group_master'
  );
```

#### Test 6.2: Verify group_size accuracy
```sql
-- Should show matching counts
SELECT 
  gb.group_id,
  gb.group_size as recorded_size,
  COUNT(DISTINCT b.id) as actual_booking_count,
  (gb.group_size = COUNT(DISTINCT b.id)) as size_matches
FROM group_bookings gb
LEFT JOIN bookings b ON b.metadata->>'group_id' = gb.group_id::text
  AND b.status NOT IN ('cancelled')
WHERE gb.tenant_id = current_user_tenant()
GROUP BY gb.id
HAVING gb.group_size != COUNT(DISTINCT b.id);
-- Expected: 0 rows (all group sizes accurate)
```

#### Test 6.3: Verify master folio aggregation
```sql
-- Should show accurate balance aggregation
SELECT 
  gb.group_id,
  gb.group_name,
  sf_master.folio_number as master_folio,
  sf_master.total_charges as master_charges,
  sf_master.total_payments as master_payments,
  sf_master.balance as master_balance,
  SUM(sf_child.total_charges) as children_charges,
  SUM(sf_child.total_payments) as children_payments,
  SUM(sf_child.balance) as children_balance,
  (sf_master.balance + COALESCE(SUM(sf_child.balance), 0)) as total_group_balance
FROM group_bookings gb
LEFT JOIN stay_folios sf_master ON sf_master.id = gb.master_folio_id
LEFT JOIN stay_folios sf_child ON sf_child.parent_folio_id = sf_master.id
WHERE gb.tenant_id = current_user_tenant()
GROUP BY gb.id, sf_master.id
ORDER BY gb.created_at DESC
LIMIT 10;
```

### 7. End-to-End Workflow Tests

#### Workflow 1: Create Group Booking → Check In → Make Payment → Close Child to Master
1. **Create group booking with 3 rooms**
   - Verify group_bookings record created
   - Verify master folio created with GMF prefix
   - Verify 3 bookings created with same group_id

2. **Check in first guest**
   - Verify room folio created
   - Verify parent_folio_id links to master
   - Verify booking status = 'checked_in'
   - Verify group status = 'in_house'

3. **Add charges to child folio**
   - Post room charge to child folio
   - Verify child folio balance increases
   - Verify master folio balance unchanged (direct charges only)

4. **Make payment on child folio**
   - Record payment on child folio
   - Verify child folio balance decreases
   - Verify payment appears in folio_transactions

5. **Close child folio to master**
   - Call close_child_folio_to_master RPC
   - Verify child folio status = 'closed'
   - Verify child balance transferred to master
   - Verify transfer transactions created

**Verification:**
```sql
-- Final state check
SELECT * FROM get_group_master_folio(
  p_tenant_id := current_user_tenant(),
  p_group_id := 'YOUR_TEST_GROUP_ID'
);
```

#### Workflow 2: Cancel Group Booking
1. **Create group booking with 2 rooms**
2. **Cancel all bookings in group**
   - Update all bookings status to 'cancelled'
   - Verify group_bookings.status = 'cancelled'
   - Verify group_size updated (excludes cancelled)

### 8. Performance Tests

#### Test 8.1: Query performance on get_group_master_folio
```sql
EXPLAIN ANALYZE
SELECT * FROM get_group_master_folio(
  p_tenant_id := current_user_tenant(),
  p_group_id := (SELECT group_id FROM group_bookings LIMIT 1)
);
-- Should complete in < 100ms
```

#### Test 8.2: Index usage verification
```sql
-- Verify indexes are being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM group_bookings 
WHERE tenant_id = current_user_tenant() 
  AND group_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
-- Should use idx_group_bookings_tenant_group index
```

## Success Criteria

✅ **Phase 1-4 Complete:**
- [ ] group_bookings table exists with RLS policies
- [ ] All 3 RPCs deployed and functional
- [ ] 28 existing groups backfilled with master folios
- [ ] 4 triggers active and validating correctly

✅ **Edge Functions:**
- [ ] create-booking deploys successfully
- [ ] checkin-guest deploys successfully
- [ ] Both functions show version markers in logs
- [ ] Master folio creation works for first booking in group
- [ ] Child folios link to master on check-in

✅ **Frontend:**
- [ ] useGroupMasterFolio hook calls correct RPC signature
- [ ] GroupBillingCenter page renders without errors
- [ ] Real-time subscriptions working
- [ ] Navigation from booking confirmation works

✅ **Data Integrity:**
- [ ] No orphaned child folios
- [ ] group_size accurately reflects booking count
- [ ] Master folio aggregations accurate
- [ ] No data inconsistencies in production

✅ **Performance:**
- [ ] get_group_master_folio completes < 100ms
- [ ] Indexes used correctly
- [ ] No N+1 query issues

## Rollback Plan

If any critical issues found during testing:

1. **Emergency Rollback (Database Only):**
```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trigger_update_group_size ON bookings;
DROP TRIGGER IF EXISTS trigger_validate_group_master_folio ON stay_folios;
DROP TRIGGER IF EXISTS trigger_sync_group_booking_status ON bookings;
DROP TRIGGER IF EXISTS trigger_prevent_master_folio_deletion ON stay_folios;

-- Remove functions
DROP FUNCTION IF EXISTS update_group_size();
DROP FUNCTION IF EXISTS validate_group_master_folio();
DROP FUNCTION IF EXISTS sync_group_booking_status();
DROP FUNCTION IF EXISTS prevent_master_folio_deletion();
DROP FUNCTION IF EXISTS create_group_master_folio(uuid, uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS get_group_master_folio(uuid, uuid);
DROP FUNCTION IF EXISTS close_child_folio_to_master(uuid, uuid);

-- Keep group_bookings table for data preservation
-- Manual cleanup if needed
```

2. **Edge Function Rollback:**
   - Revert create-booking to previous version
   - Revert checkin-guest to previous version
   - Deploy reverted versions

3. **Frontend Rollback:**
   - Revert useGroupMasterFolio hook changes
   - Revert GroupBillingCenter route parameter
   - Revert BookingFlow groupId field

## Next Steps After Testing

Once all tests pass:
- Proceed to **Phase 6: Night Audit Compatibility**
- Update night-audit-run edge function for group folio aggregation
- Add group master folio sections to night audit reports
- Document complete group booking system for end users
