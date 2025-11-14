# PowerSync Setup Instructions for Multi-Tenant HMS/PMS

## 🎯 Overview

This setup enables **offline-first sync** for your multi-tenant hotel management system with proper data isolation:

- **Tenant Users** (hotel staff) → Only see their hotel's data
- **Platform Admins** → Full access to all tenant data + platform management

---

## 📋 Prerequisites

1. ✅ Supabase project is running
2. ✅ `user_roles` table exists (links users → tenants)
3. ✅ `platform_users` table exists (identifies platform admins)
4. ✅ All tables have `tenant_id` column
5. ✅ RLS policies are configured

---

## 🚀 Step 1: Deploy Sync Rules to PowerSync

### Option A: PowerSync Dashboard (Recommended)

1. Go to your [PowerSync Dashboard](https://powersync.journeyapps.com/)
2. Navigate to your project
3. Click **"Sync Rules"** in the left sidebar
4. Click **"Edit Sync Rules"**
5. **Copy the entire contents** of `sync-rules.yaml` from this directory
6. **Paste** into the editor
7. Click **"Validate"** to check for syntax errors
8. Click **"Deploy"** to activate the rules

### Option B: PowerSync CLI

```bash
# Install PowerSync CLI
npm install -g @powersync/cli

# Deploy sync rules
powersync deploy sync-rules.yaml
```

---

## 🔧 Step 2: Configure PowerSync Connection

### In PowerSync Dashboard:

1. Go to **Settings → Database**
2. Configure Supabase connection:
   - **Database URL**: `https://akchmpmzcupzjaeewdui.supabase.co`
   - **Database Password**: Your Supabase database password
   - **Supabase Project ID**: `akchmpmzcupzjaeewdui`

---

## 🧪 Step 3: Test Data Isolation

### Test 1: Tenant User Access

1. **Login as a hotel staff user** (exists in `user_roles` table)
2. Run this query in your app:

```sql
-- Should only return data for their tenant
SELECT * FROM bookings;
SELECT * FROM guests;
SELECT * FROM rooms;
```

3. **Expected Result**: Only see data where `tenant_id` matches their tenant

### Test 2: Platform Admin Access

1. **Login as a platform admin** (exists in `platform_users` table)
2. Run the same queries:

```sql
SELECT * FROM bookings;
SELECT * FROM guests;
SELECT * FROM platform_tenants;
```

3. **Expected Result**: See **ALL data** across all tenants + platform management tables

### Test 3: Cross-Tenant Isolation

1. **Login as Tenant User A**
2. Try to access data from Tenant B:

```sql
SELECT * FROM bookings WHERE tenant_id = '<tenant_b_id>';
```

3. **Expected Result**: Empty result set (RLS blocks access)

---

## 🔍 Step 4: Verify Sync Buckets

Check which bucket each user is assigned to:

```sql
-- Run in Supabase SQL Editor
SELECT 
  auth.uid() AS user_id,
  CASE 
    WHEN EXISTS(SELECT 1 FROM platform_users WHERE id = auth.uid()) 
    THEN 'global_admin'
    WHEN EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid())
    THEN 'tenant_data'
    ELSE 'no_bucket'
  END AS assigned_bucket;
```

**Expected Results:**
- Platform admins → `global_admin`
- Hotel staff → `tenant_data`
- Unassigned users → `no_bucket` (no sync access)

---

## 📱 Step 5: Integrate PowerSync SDK

### Install PowerSync SDK

```bash
npm install @powersync/react-native
# or
npm install @powersync/web
```

### Configure Client

```typescript
import { PowerSyncDatabase } from '@powersync/web';
import { supabase } from '@/integrations/supabase/client';

const powerSync = new PowerSyncDatabase({
  database: {
    dbFilename: 'hotel-pms.db'
  },
  sync: {
    supabaseUrl: 'https://akchmpmzcupzjaeewdui.supabase.co',
    powersyncUrl: 'https://your-instance.powersync.journeyapps.com'
  }
});

// Connect with user authentication
await powerSync.connect({
  token: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  }
});
```

---

## ✅ Verification Checklist

Run through this checklist to ensure everything works:

- [ ] **Deploy sync rules** to PowerSync dashboard
- [ ] **Configure database connection** in PowerSync
- [ ] **Test tenant user login** → sees only their data
- [ ] **Test platform admin login** → sees all data
- [ ] **Test offline mode** → data persists locally
- [ ] **Test real-time sync** → changes appear immediately
- [ ] **Verify data isolation** → no cross-tenant leakage
- [ ] **Check bucket assignment** → users assigned to correct bucket

---

## 🐛 Troubleshooting

### Issue: "No data syncing for tenant users"

**Check:**
```sql
SELECT * FROM user_roles WHERE user_id = auth.uid();
```
- User must exist in `user_roles` table
- Must have valid `tenant_id`

### Issue: "Platform admin sees no data"

**Check:**
```sql
SELECT * FROM platform_users WHERE id = auth.uid();
```
- User must exist in `platform_users` table

### Issue: "RLS policy blocking PowerSync"

**Solution:** Ensure RLS policies use `SECURITY DEFINER` functions:

```sql
-- These functions should already exist
SELECT has_role(auth.uid(), 'owner');
SELECT get_user_tenant(auth.uid());
SELECT is_platform_admin(auth.uid());
```

### Issue: "Sync rules validation failed"

**Common causes:**
- Missing table in database
- Incorrect column name in WHERE clause
- SQL syntax error

**Fix:** Run each SELECT query individually in Supabase SQL Editor to identify the issue.

---

## 📊 Monitoring Sync Health

### PowerSync Dashboard Metrics

Monitor these in your PowerSync dashboard:

1. **Sync Status** → Active connections
2. **Data Volume** → Bytes synced per bucket
3. **Query Performance** → Slow queries
4. **Error Logs** → Failed sync attempts

### Client-Side Monitoring

```typescript
// Monitor sync status
powerSync.currentStatus.subscribe(status => {
  console.log('Sync status:', status.connected ? 'Connected' : 'Disconnected');
  console.log('Last synced:', status.lastSyncedAt);
});
```

---

## 🔐 Security Notes

1. ✅ **Data isolation enforced** via sync bucket parameters
2. ✅ **RLS policies** provide defense-in-depth
3. ✅ **No client-side tenant filtering** (handled by PowerSync)
4. ✅ **Platform admins verified** via `platform_users` table
5. ✅ **JWT token required** for all sync requests

---

## 🆘 Support

If you encounter issues:

1. Check PowerSync dashboard logs
2. Review Supabase RLS policies
3. Verify user exists in `user_roles` or `platform_users`
4. Test SQL queries manually in Supabase SQL Editor

---

## 📚 Additional Resources

- [PowerSync Documentation](https://docs.powersync.com/)
- [PowerSync + Supabase Guide](https://docs.powersync.com/integration-guides/supabase)
- [Multi-tenant Best Practices](https://docs.powersync.com/usage/sync-rules/multi-tenancy)
