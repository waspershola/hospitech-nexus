# PowerSync Testing Guide

## 🧪 Complete Testing Checklist

### Pre-Deployment Tests (Run in Supabase SQL Editor)

#### Test 1: Verify User Role Setup

```sql
-- Check tenant users
SELECT 
  ur.user_id,
  ur.tenant_id,
  ur.role,
  t.name AS tenant_name,
  p.email
FROM user_roles ur
JOIN tenants t ON t.id = ur.tenant_id
LEFT JOIN profiles p ON p.id = ur.user_id
LIMIT 10;

-- Expected: List of hotel staff with tenant assignments
```

#### Test 2: Verify Platform Admins

```sql
-- Check platform users
SELECT 
  pu.id,
  pu.email,
  pu.role AS platform_role,
  p.email AS auth_email
FROM platform_users pu
LEFT JOIN profiles p ON p.id = pu.id;

-- Expected: List of platform admins
```

#### Test 3: Test Bucket Parameter Logic

```sql
-- Simulate tenant_data bucket parameter
-- Replace <user_id> with actual tenant user ID
SELECT 
  user_roles.tenant_id,
  tenants.name AS tenant_name
FROM user_roles
JOIN tenants ON tenants.id = user_roles.tenant_id
WHERE user_roles.user_id = '<user_id>'
LIMIT 1;

-- Expected: Single row with tenant_id and name
```

#### Test 4: Test Data Filtering

```sql
-- Simulate tenant_data bucket data query
-- Replace <tenant_id> with actual tenant ID
SELECT COUNT(*) AS booking_count FROM bookings WHERE tenant_id = '<tenant_id>';
SELECT COUNT(*) AS guest_count FROM guests WHERE tenant_id = '<tenant_id>';
SELECT COUNT(*) AS room_count FROM rooms WHERE tenant_id = '<tenant_id>';

-- Expected: Counts matching tenant's actual data
```

#### Test 5: Test Platform Admin Access

```sql
-- Simulate global_admin bucket parameter
-- Replace <admin_user_id> with actual platform admin ID
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM platform_users WHERE id = '<admin_user_id>') 
    THEN true 
    ELSE false 
  END AS is_platform_admin;

-- Expected: true
```

---

### Post-Deployment Tests (In PowerSync Dashboard)

#### Test 6: Validate Sync Rules

1. Go to PowerSync Dashboard → Sync Rules
2. Click **"Validate"**
3. **Expected:** ✅ No errors, all tables found

#### Test 7: Check Bucket Assignments

```sql
-- Run in your app after authentication
SELECT 
  current_user_id(),
  current_bucket_name();

-- Expected for tenant users: 'tenant_data'
-- Expected for platform admins: 'global_admin'
```

---

### Client-Side Tests (In Your Application)

#### Test 8: Tenant User Data Isolation

**Setup:**
1. Login as **Tenant User A** (hotel staff from Hotel A)

**Test:**
```typescript
// Should only return Hotel A's data
const bookings = await powerSync.query('SELECT * FROM bookings');
const guests = await powerSync.query('SELECT * FROM guests');
const rooms = await powerSync.query('SELECT * FROM rooms');

console.log('Bookings:', bookings.length);
console.log('Guests:', guests.length);
console.log('Rooms:', rooms.length);

// Verify all records have same tenant_id
const uniqueTenantIds = new Set(bookings.map(b => b.tenant_id));
console.log('Unique tenant IDs:', uniqueTenantIds.size); // Should be 1
```

**Expected Result:**
- ✅ Only data from Hotel A
- ✅ All records share same `tenant_id`
- ✅ Cannot see Hotel B's data

#### Test 9: Cross-Tenant Access Block

**Setup:**
1. Login as **Tenant User A**
2. Get `tenant_id` of **Hotel B** from database

**Test:**
```typescript
// Try to query Hotel B's data directly (should fail)
const hotelBId = '<hotel_b_tenant_id>';
const result = await powerSync.query(
  'SELECT * FROM bookings WHERE tenant_id = ?',
  [hotelBId]
);

console.log('Cross-tenant access result:', result.length);
```

**Expected Result:**
- ✅ Returns empty array (0 results)
- ✅ No error thrown (silently filtered)

#### Test 10: Platform Admin Full Access

**Setup:**
1. Login as **Platform Admin**

**Test:**
```typescript
// Should return ALL data across ALL tenants
const allBookings = await powerSync.query('SELECT * FROM bookings');
const allGuests = await powerSync.query('SELECT * FROM guests');
const allTenants = await powerSync.query('SELECT * FROM tenants');

const uniqueTenantIds = new Set(allBookings.map(b => b.tenant_id));
console.log('Total bookings:', allBookings.length);
console.log('Unique tenants represented:', uniqueTenantIds.size);

// Platform-specific tables
const platformTenants = await powerSync.query('SELECT * FROM platform_tenants');
console.log('Platform tenants:', platformTenants.length);
```

**Expected Result:**
- ✅ See data from ALL hotels
- ✅ Multiple unique `tenant_id` values
- ✅ Access to `platform_tenants` table

#### Test 11: Real-Time Sync

**Setup:**
1. Open app on **Device A** (Tenant User)
2. Open app on **Device B** (Same Tenant User)

**Test:**
```typescript
// Device A: Create new booking
const { data } = await supabase.from('bookings').insert({
  guest_id: '<guest_id>',
  room_id: '<room_id>',
  check_in: '2024-01-15',
  check_out: '2024-01-17',
  tenant_id: '<tenant_id>'
});

// Device B: Listen for updates
powerSync.watch('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 1')
  .subscribe(result => {
    console.log('Latest booking:', result.rows[0]);
  });
```

**Expected Result:**
- ✅ Device B receives update within 1-2 seconds
- ✅ New booking appears in local database

#### Test 12: Offline Mode

**Setup:**
1. Login as Tenant User
2. Wait for initial sync to complete

**Test:**
```typescript
// Check sync status
const status = await powerSync.currentStatus;
console.log('Initial status:', status.connected);

// Disconnect from network (airplane mode)
await powerSync.disconnect();

// Try to query data (should work from local DB)
const bookings = await powerSync.query('SELECT * FROM bookings');
console.log('Offline bookings count:', bookings.length);

// Try to insert data offline
const { data } = await supabase.from('bookings').insert({
  guest_id: '<guest_id>',
  room_id: '<room_id>',
  check_in: '2024-01-20',
  check_out: '2024-01-22',
  tenant_id: '<tenant_id>'
});

// Reconnect
await powerSync.connect();

// Verify offline changes synced
```

**Expected Result:**
- ✅ Queries work offline
- ✅ Writes queued for sync
- ✅ Changes upload when reconnected

#### Test 13: User Profile Access

**Test:**
```typescript
// Should only see own profile
const profiles = await powerSync.query('SELECT * FROM profiles');
console.log('Profiles count:', profiles.length); // Should be 1
console.log('Profile user_id:', profiles[0].id);
console.log('Current user_id:', await supabase.auth.getUser().then(u => u.data.user?.id));
```

**Expected Result:**
- ✅ Only 1 profile returned
- ✅ Profile ID matches current user ID

---

### Performance Tests

#### Test 14: Initial Sync Time

```typescript
const startTime = Date.now();

await powerSync.connect();

powerSync.currentStatus.subscribe(status => {
  if (status.connected && !status.syncing) {
    const syncDuration = Date.now() - startTime;
    console.log('Initial sync completed in:', syncDuration, 'ms');
  }
});
```

**Expected Result:**
- ✅ Sync completes in reasonable time (<30s for typical hotel)
- ✅ Progress indicator shows status

#### Test 15: Query Performance

```typescript
// Test local query speed
const start = Date.now();
const bookings = await powerSync.query('SELECT * FROM bookings WHERE status = ?', ['confirmed']);
const duration = Date.now() - start;

console.log('Query returned', bookings.length, 'results in', duration, 'ms');
```

**Expected Result:**
- ✅ Queries complete in <100ms
- ✅ No network latency

---

### Security Tests

#### Test 16: Unauthenticated Access

**Test:**
```typescript
// Logout user
await supabase.auth.signOut();

// Try to sync (should fail)
try {
  await powerSync.connect();
  console.error('❌ Security issue: Unauthenticated sync succeeded');
} catch (error) {
  console.log('✅ Correctly blocked unauthenticated access');
}
```

**Expected Result:**
- ✅ Sync fails without authentication
- ✅ Error message about missing token

#### Test 17: JWT Expiration

**Test:**
```typescript
// Wait for JWT to expire (default: 1 hour)
// Or manually expire token in database

// Try to query data
try {
  const bookings = await powerSync.query('SELECT * FROM bookings');
  console.log('Token refresh worked, got', bookings.length, 'bookings');
} catch (error) {
  console.error('❌ Token refresh failed:', error);
}
```

**Expected Result:**
- ✅ PowerSync auto-refreshes token
- ✅ Queries continue to work

---

## 📊 Test Results Template

Create a document with these results:

```markdown
## PowerSync Test Results - [Date]

### Environment
- App version: [version]
- PowerSync version: [version]
- Test device: [device/browser]

### Pre-Deployment Tests
- [ ] Test 1: User role setup ✅/❌
- [ ] Test 2: Platform admins ✅/❌
- [ ] Test 3: Bucket parameters ✅/❌
- [ ] Test 4: Data filtering ✅/❌
- [ ] Test 5: Admin access ✅/❌

### Post-Deployment Tests
- [ ] Test 6: Sync rules validation ✅/❌
- [ ] Test 7: Bucket assignments ✅/❌

### Client-Side Tests
- [ ] Test 8: Tenant isolation ✅/❌
- [ ] Test 9: Cross-tenant block ✅/❌
- [ ] Test 10: Admin full access ✅/❌
- [ ] Test 11: Real-time sync ✅/❌
- [ ] Test 12: Offline mode ✅/❌
- [ ] Test 13: Profile access ✅/❌

### Performance Tests
- [ ] Test 14: Initial sync time: [X]ms ✅/❌
- [ ] Test 15: Query performance: [X]ms ✅/❌

### Security Tests
- [ ] Test 16: Unauthenticated block ✅/❌
- [ ] Test 17: JWT refresh ✅/❌

### Issues Found
1. [Issue description]
2. [Issue description]

### Sign-off
Tested by: [Name]
Date: [Date]
Status: PASS / FAIL
```

---

## 🚨 Critical Issues to Watch For

1. **Tenant data leakage** → Tenant A sees Tenant B's data
2. **Platform admin can't see all data** → Missing records
3. **Sync never completes** → Timeout or error
4. **Offline writes lost** → Data not synced when reconnected
5. **RLS conflicts** → PowerSync blocked by policies

If any critical issue occurs, **STOP** and review:
- Sync rules syntax
- RLS policies
- User role assignments
- Database indexes (for performance)
