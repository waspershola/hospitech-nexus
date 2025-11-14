# 🚀 PowerSync Deployment Guide - View-Based Architecture

## Overview

This guide walks you through deploying the **view-based multi-tenant sync setup** for your HMS/PMS system.

**Architecture:**
- ✅ Tenant-specific database views filter data at the database level
- ✅ Simplified PowerSync rules (no complex WHERE clauses)
- ✅ Two-tier user system (Platform Admins + Tenant Users)
- ✅ Centralized security and easy debugging

---

## 📋 Prerequisites

- [x] Supabase project is set up and running
- [x] `user_roles` table exists (links users → tenants)
- [x] `platform_users` table exists (identifies platform admins)
- [x] All tables have `tenant_id` column
- [x] RLS policies are configured
- [x] PowerSync account and project created

---

## 🎯 Deployment Steps

### **Step 1: Apply SQL Migration (Create Views)**

#### **Option A: Supabase Dashboard (Recommended)**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Copy the entire contents of `supabase/migrations/20250115000000_create_tenant_views.sql`
5. Paste into the editor
6. Click **"Run"** to execute
7. Verify success (should see "Success. No rows returned")

#### **Option B: Supabase CLI**

```bash
# Make sure you're in the project root
cd /path/to/your/project

# Apply the migration
supabase db push

# Or run the migration file directly
supabase db execute --file supabase/migrations/20250115000000_create_tenant_views.sql
```

#### **Verify Views Were Created**

Run this query in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'v_%'
ORDER BY table_name;
```

**Expected Result:** Should return ~50+ views (v_bookings, v_guests, v_rooms, etc.)

---

### **Step 2: Test Views in Supabase**

#### **Test 1: Tenant User Access**

Login as a tenant user (hotel staff) and run:

```sql
-- Switch to the tenant user's session
SET LOCAL jwt.claims.sub = '<tenant_user_uuid>';

-- Test views
SELECT COUNT(*) FROM v_bookings;
SELECT COUNT(*) FROM v_guests;
SELECT COUNT(*) FROM v_rooms;

-- Should only return data for their tenant
```

#### **Test 2: Verify Tenant Isolation**

```sql
-- Check that views filter correctly
SELECT DISTINCT tenant_id FROM v_bookings;

-- Should return only ONE tenant_id (the user's tenant)
```

#### **Test 3: View Performance**

```sql
-- Check query plan for a view
EXPLAIN ANALYZE SELECT * FROM v_bookings WHERE status = 'confirmed';

-- Should show efficient filtering by tenant_id
```

---

### **Step 3: Deploy PowerSync Sync Rules**

#### **Option A: PowerSync Dashboard (Recommended)**

1. Go to your [PowerSync Dashboard](https://powersync.journeyapps.com/)
2. Navigate to your project
3. Click **"Sync Rules"** in the left sidebar
4. Click **"Edit Sync Rules"**
5. **Delete all existing rules** (if any)
6. Copy the entire contents of `powersync/sync-rules-views.yaml`
7. Paste into the editor
8. Click **"Validate"** to check for syntax errors
9. Fix any validation errors (should pass on first try)
10. Click **"Deploy"** to activate the rules

#### **Option B: PowerSync CLI**

```bash
# Install PowerSync CLI (if not already installed)
npm install -g @powersync/cli

# Deploy sync rules
powersync deploy powersync/sync-rules-views.yaml
```

---

### **Step 4: Configure PowerSync Connection**

#### **In PowerSync Dashboard:**

1. Go to **Settings → Database**
2. Configure Supabase connection:
   - **Database URL**: `https://akchmpmzcupzjaeewdui.supabase.co`
   - **Database Password**: Your Supabase database password
   - **Project ID**: `akchmpmzcupzjaeewdui`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4`

3. Click **"Test Connection"**
4. Verify connection succeeds

---

### **Step 5: Verify Sync Buckets**

#### **Check Bucket Assignment**

Run this in Supabase SQL Editor:

```sql
SELECT 
  auth.uid() AS user_id,
  CASE 
    WHEN EXISTS(SELECT 1 FROM platform_users WHERE id = auth.uid()) 
    THEN 'global_admin'
    WHEN EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid())
    THEN 'tenant_data'
    ELSE 'no_bucket'
  END AS assigned_bucket,
  (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1) AS tenant_id;
```

**Expected Results:**
- Platform admins → `global_admin` bucket
- Hotel staff → `tenant_data` bucket
- Unassigned users → `no_bucket` (no sync access)

---

### **Step 6: Test Data Isolation**

#### **Test 1: Tenant User Sync**

1. Login as a tenant user in your app
2. Open browser console
3. Run:

```javascript
// Check synced data
const bookings = await powerSync.execute("SELECT * FROM v_bookings");
console.log("Bookings:", bookings);

// Verify tenant isolation
const distinctTenants = await powerSync.execute(
  "SELECT DISTINCT tenant_id FROM v_bookings"
);
console.log("Tenant IDs:", distinctTenants); // Should be 1 tenant only
```

#### **Test 2: Platform Admin Sync**

1. Login as a platform admin in your app
2. Run:

```javascript
// Check full access
const allBookings = await powerSync.execute("SELECT * FROM bookings");
console.log("All Bookings:", allBookings);

// Should see data from ALL tenants
const tenantCount = await powerSync.execute(
  "SELECT COUNT(DISTINCT tenant_id) FROM bookings"
);
console.log("Number of tenants:", tenantCount); // Should be > 1
```

#### **Test 3: Cross-Tenant Isolation**

1. Login as Tenant User A
2. Try to access Tenant B's data:

```javascript
// This should return EMPTY (blocked by views)
const otherTenantData = await powerSync.execute(
  "SELECT * FROM v_bookings WHERE tenant_id = '<tenant_b_id>'"
);
console.log("Other tenant data:", otherTenantData); // Should be []
```

---

## 🐛 Troubleshooting

### **Issue: Views return empty results**

**Check:**
```sql
-- Verify user has a role assigned
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- Check if user has a tenant_id
SELECT tenant_id FROM user_roles WHERE user_id = auth.uid();
```

**Solution:** Ensure user exists in `user_roles` table with valid `tenant_id`.

---

### **Issue: Platform admin sees no data**

**Check:**
```sql
-- Verify user is in platform_users table
SELECT * FROM platform_users WHERE id = auth.uid();
```

**Solution:** Add user to `platform_users` table.

---

### **Issue: PowerSync sync rules validation fails**

**Common Causes:**
- Missing table in database
- View doesn't exist (run migration first)
- SQL syntax error
- Missing schema prefix

**Fix:** 
1. Verify all views exist in Supabase
2. Check PowerSync dashboard error message
3. Run each SELECT query individually in Supabase SQL Editor

---

### **Issue: Sync performance is slow**

**Check:**
```sql
-- Analyze view query plan
EXPLAIN ANALYZE SELECT * FROM v_bookings WHERE status = 'confirmed';
```

**Optimization:**
- Add indexes on frequently queried columns
- Ensure `tenant_id` has an index
- Consider materialized views for complex queries

---

## 📊 Monitoring Sync Health

### **PowerSync Dashboard Metrics**

Monitor these in your PowerSync dashboard:

1. **Sync Status** → Active connections per bucket
2. **Data Volume** → Bytes synced (should be lower with views)
3. **Query Performance** → View query execution time
4. **Error Logs** → Failed sync attempts

### **Client-Side Monitoring**

```typescript
// Monitor sync status
powerSync.currentStatus.subscribe(status => {
  console.log('Bucket:', status.bucket); // Should be 'tenant_data' or 'global_admin'
  console.log('Connected:', status.connected);
  console.log('Last synced:', status.lastSyncedAt);
  console.log('Synced rows:', status.syncedRows);
});

// Monitor sync errors
powerSync.syncErrorHandler = (error) => {
  console.error('Sync error:', error);
  // Log to your monitoring service (Sentry, DataDog, etc.)
};
```

---

## ✅ Verification Checklist

Run through this checklist to ensure everything works:

- [ ] **SQL Views Created**: All 50+ views exist in Supabase
- [ ] **Views Return Data**: Test queries in SQL Editor succeed
- [ ] **PowerSync Rules Deployed**: Sync rules pass validation
- [ ] **Database Connection**: PowerSync connects to Supabase
- [ ] **Tenant User Sync**: Hotel staff see only their data
- [ ] **Platform Admin Sync**: Admins see all tenant data
- [ ] **Data Isolation**: No cross-tenant data leakage
- [ ] **Real-time Sync**: Changes appear within seconds
- [ ] **Offline Mode**: Data persists locally when offline
- [ ] **Performance**: Sync completes in < 10 seconds
- [ ] **User Profiles**: Current user can access their profile
- [ ] **Bucket Assignment**: Users assigned to correct bucket

---

## 🎉 Success Indicators

You'll know the deployment succeeded when:

✅ Tenant users only see their hotel's data
✅ Platform admins see all tenants' data
✅ Data syncs in real-time (< 5 second latency)
✅ Offline mode works (data persists locally)
✅ No SQL errors in PowerSync dashboard
✅ Views show up in Supabase schema
✅ Query performance is fast (< 100ms)

---

## 🔐 Security Notes

1. ✅ **Tenant isolation enforced at database level** (via views)
2. ✅ **No client-side filtering** (handled by PowerSync + views)
3. ✅ **RLS policies** provide defense-in-depth
4. ✅ **Platform admins verified** via `platform_users` table
5. ✅ **JWT token required** for all sync requests
6. ✅ **Views can't be bypassed** (permissions locked to SELECT only)

---

## 📚 Additional Resources

- [PowerSync Documentation](https://docs.powersync.com/)
- [PowerSync + Supabase Guide](https://docs.powersync.com/integration-guides/supabase)
- [Multi-tenant Best Practices](https://docs.powersync.com/usage/sync-rules/multi-tenancy)
- [Supabase Views Documentation](https://supabase.com/docs/guides/database/views)

---

## 🆘 Support

If you encounter issues:

1. Check PowerSync dashboard logs
2. Review Supabase RLS policies
3. Verify user exists in `user_roles` or `platform_users`
4. Test SQL queries manually in Supabase SQL Editor
5. Check view definitions for correctness

---

## 🔄 Rollback Plan

If you need to rollback:

### **Rollback PowerSync Rules:**
1. Go to PowerSync Dashboard
2. Deploy the previous `sync-rules.yaml` (without views)
3. Verify sync works with raw tables

### **Rollback Database Views:**
```sql
-- Drop all views
DROP VIEW IF EXISTS v_bookings CASCADE;
DROP VIEW IF EXISTS v_guests CASCADE;
-- ... (drop all other views)

-- Or use this script to drop all v_* views
DO $$
DECLARE
  view_name text;
BEGIN
  FOR view_name IN 
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_schema = 'public' 
      AND table_name LIKE 'v_%'
  LOOP
    EXECUTE 'DROP VIEW IF EXISTS ' || view_name || ' CASCADE';
  END LOOP;
END $$;
```

---

## 🚀 Next Steps

After successful deployment:

1. **Monitor Performance**: Track sync speed and data volume
2. **Add Indexes**: Optimize frequently queried columns
3. **Test Edge Cases**: Multi-tenant users, guest access, etc.
4. **Document Workflows**: Share with your team
5. **Set Up Alerts**: Monitor sync failures in production

---

**Deployment completed? ✅ Your multi-tenant sync is now live!**
