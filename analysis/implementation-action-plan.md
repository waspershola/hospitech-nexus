# 🎯 Role System Implementation - Action Plan

## **PHASE 1: CRITICAL FIXES** (Next 2-4 Hours)

### Task 1.1: Seed Navigation Data ⚡ BLOCKING
**Priority:** 🔴 CRITICAL  
**Time:** 15 minutes  
**Blocks:** All users from seeing navigation menu

**Steps:**
1. Get all tenant IDs from database
2. Insert default navigation items for each tenant
3. Verify navigation appears in Sidebar

**SQL to Execute:**
```sql
-- Get tenant IDs first, then insert for each
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index)
SELECT 
  t.id,
  item.name,
  item.path,
  item.icon,
  item.allowed_roles::app_role[],
  item.order_index
FROM tenants t
CROSS JOIN (VALUES
  ('Overview', '/dashboard', 'Home', ARRAY['owner','manager','frontdesk','finance','accountant'], 1),
  ('Front Desk', '/dashboard/front-desk', 'LayoutDashboard', ARRAY['owner','manager','frontdesk'], 2),
  ('Rooms', '/dashboard/rooms', 'Bed', ARRAY['owner','manager','frontdesk','housekeeping','maintenance'], 3),
  ('Categories', '/dashboard/room-categories', 'Grid3x3', ARRAY['owner','manager'], 4),
  ('Bookings', '/dashboard/bookings', 'CalendarRange', ARRAY['owner','manager','frontdesk','finance','accountant'], 5),
  ('Guests', '/dashboard/guests', 'Users', ARRAY['owner','manager','frontdesk','finance'], 6),
  ('Wallets', '/dashboard/wallets', 'Wallet', ARRAY['owner','manager','finance','accountant'], 7),
  ('Finance Center', '/dashboard/finance', 'DollarSign', ARRAY['owner','manager','finance','accountant'], 8),
  ('Debtors', '/dashboard/debtors', 'TrendingDown', ARRAY['owner','manager','finance','accountant'], 9),
  ('Reports', '/dashboard/reports', 'FileText', ARRAY['owner','manager','finance','accountant'], 10),
  ('Configuration', '/dashboard/configuration', 'Settings', ARRAY['owner','manager'], 11)
) AS item(name, path, icon, allowed_roles, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM navigation_items ni 
  WHERE ni.tenant_id = t.id AND ni.name = item.name
);
```

**Test:**
```bash
# After seeding, verify in UI:
1. Login as owner -> Should see all 11 nav items
2. Login as frontdesk -> Should see 6 nav items
3. Login as finance -> Should see 8 nav items
```

---

### Task 1.2: Secure `create-payment` Edge Function 🔒
**Priority:** 🔴 CRITICAL SECURITY  
**Time:** 30 minutes  
**Risk:** Anyone can create payments without authorization

**Implementation:**
```typescript
// Add after line 40 (after creating supabase client)

// Get authenticated user
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: corsHeaders }
  );
}

// Get user role
const { data: userRole, error: roleError } = await supabase
  .from('user_roles')
  .select('role, tenant_id')
  .eq('user_id', user.id)
  .single();

if (roleError || !userRole) {
  return new Response(
    JSON.stringify({ error: 'No role assigned' }),
    { status: 403, headers: corsHeaders }
  );
}

// Check role permissions
const allowedRoles = ['owner', 'manager', 'frontdesk', 'finance', 'accountant'];
if (!allowedRoles.includes(userRole.role)) {
  return new Response(
    JSON.stringify({ 
      error: 'Insufficient permissions to create payments',
      required_roles: allowedRoles,
      user_role: userRole.role
    }),
    { status: 403, headers: corsHeaders }
  );
}

// Verify tenant_id matches
if (tenant_id !== userRole.tenant_id) {
  return new Response(
    JSON.stringify({ error: 'Tenant mismatch - unauthorized' }),
    { status: 403, headers: corsHeaders }
  );
}
```

**Files to Update:**
- `supabase/functions/create-payment/index.ts` (after line 78)

**Test:**
```bash
# Try calling edge function as housekeeping role -> Should get 403
# Try calling as frontdesk -> Should succeed
# Try calling with wrong tenant_id -> Should get 403
```

---

### Task 1.3: Secure `complete-checkout` Edge Function 🔒
**Priority:** 🔴 CRITICAL SECURITY  
**Time:** 30 minutes  
**Risk:** Anyone can checkout guests and manipulate billing

**Implementation:**
```typescript
// Add after line 23 (after creating supabase client)

// Get authenticated user from JWT
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: 'No authorization header' }),
    { status: 401, headers: corsHeaders }
  );
}

// Create admin client for role check
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Extract user from token
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

if (userError || !user) {
  return new Response(
    JSON.stringify({ error: 'Invalid token' }),
    { status: 401, headers: corsHeaders }
  );
}

// Get user role
const { data: userRole, error: roleError } = await supabaseAdmin
  .from('user_roles')
  .select('role, tenant_id')
  .eq('user_id', user.id)
  .single();

if (roleError || !userRole) {
  return new Response(
    JSON.stringify({ error: 'No role assigned' }),
    { status: 403, headers: corsHeaders }
  );
}

// Check role permissions
const allowedRoles = ['owner', 'manager', 'frontdesk'];
if (!allowedRoles.includes(userRole.role)) {
  return new Response(
    JSON.stringify({ 
      error: 'Insufficient permissions to complete checkout',
      required_roles: allowedRoles,
      user_role: userRole.role
    }),
    { status: 403, headers: corsHeaders }
  );
}
```

**Files to Update:**
- `supabase/functions/complete-checkout/index.ts` (after line 23)

**Test:**
```bash
# Try checkout as housekeeping -> Should get 403
# Try checkout as frontdesk -> Should succeed
# Try checkout as finance -> Should get 403
```

---

### Task 1.4: Secure `force-checkout` Edge Function 🔒
**Priority:** 🔴 HIGH SECURITY  
**Time:** 20 minutes  
**Risk:** Anyone can bypass payment requirements

**Allowed Roles:** ONLY `owner` and `manager` (most restrictive)

**Pattern:** Same as Task 1.3 but with:
```typescript
const allowedRoles = ['owner', 'manager']; // ONLY managers can force checkout
```

---

## **PHASE 2: HIGH PRIORITY** (Next 1-2 Days)

### Task 2.1: Secure Remaining Edge Functions 🔒
**Priority:** 🟡 HIGH  
**Time:** 2 hours total

**Functions to Secure:**
1. `charge-to-organization` - Roles: owner, manager, frontdesk, finance
2. `apply-wallet-credit` - Roles: owner, manager, frontdesk
3. `recalculate-financials` - Roles: owner, manager (admin function)

**Pattern:** Same role validation as Tasks 1.2-1.4

---

### Task 2.2: Fix Route Path Inconsistency
**Priority:** 🟡 MEDIUM  
**Time:** 5 minutes

**Issue:** Navigation uses `/dashboard/room-categories` but route is `/dashboard/categories`

**Fix Option 1 (Recommended):** Update route to match navigation
```typescript
// In src/App.tsx, change:
<Route path="categories" ... />
// to:
<Route path="room-categories" ... />
```

**Fix Option 2:** Update navigation seed data to use `/dashboard/categories`

---

### Task 2.3: End-to-End Testing
**Priority:** 🟡 HIGH  
**Time:** 2 hours

**Test Scenarios:**

#### Scenario 1: Owner Role
- [ ] Sees all 11 navigation items
- [ ] Overview shows finance widgets
- [ ] Can access Configuration
- [ ] Can access Finance Center
- [ ] Can create payments
- [ ] Can force checkout

#### Scenario 2: Frontdesk Role
- [ ] Sees 6 navigation items (no Finance, Wallets, Debtors, Reports, Config)
- [ ] Overview does NOT show finance widgets
- [ ] Can create bookings
- [ ] Can record payments
- [ ] Can complete checkout
- [ ] CANNOT force checkout (should get 403)

#### Scenario 3: Finance Role
- [ ] Sees 8 navigation items (has Finance, Wallets, Debtors, Reports)
- [ ] Overview shows finance widgets
- [ ] Can view finance data
- [ ] Can record payments
- [ ] CANNOT complete checkout (should get 403)

#### Scenario 4: Housekeeping Role
- [ ] Sees 3 navigation items (Overview, Rooms, maybe one more)
- [ ] In Rooms page, only sees assigned rooms OR dirty/cleaning rooms
- [ ] Cannot see finance data
- [ ] Cannot create payments (should get 403)

---

## **PHASE 3: MEDIUM PRIORITY** (Next 1-2 Weeks)

### Task 3.1: Create Room Assignment UI
**Priority:** 🟢 MEDIUM  
**Time:** 4 hours

**Components Needed:**
1. "Assign Staff" button in Rooms list (only for managers)
2. Assignment dialog/modal
3. Staff selector (fetch housekeeping users)
4. Bulk assignment support

**Files to Create:**
- `src/modules/frontdesk/components/AssignRoomStaffDialog.tsx`

**Files to Update:**
- `src/pages/dashboard/Rooms.tsx` (add assign button)

---

### Task 3.2: Build Real Widget Components
**Priority:** 🟢 MEDIUM  
**Time:** 6 hours

**Widgets to Create:**
1. **Room Stats Widget** (`src/modules/frontdesk/components/RoomStatsWidget.tsx`)
   - Shows: Available, Occupied, Cleaning, Maintenance counts
   - Role: Operations

2. **Occupancy Rate Widget** (`src/modules/frontdesk/components/OccupancyRateWidget.tsx`)
   - Shows: Current occupancy percentage with trend
   - Role: Operations

3. **Cleaning Queue Widget** (`src/modules/housekeeping/components/CleaningQueueWidget.tsx`)
   - Shows: Rooms pending cleaning with priority
   - Role: Housekeeping

**Replace placeholders in:** `src/config/widgetRegistry.tsx`

---

### Task 3.3: Enhance RLS with Permission Checks
**Priority:** 🟢 MEDIUM  
**Time:** 3 hours

**Tables to Enhance:**
1. `payments` - Use `user_has_permission()` for refunds
2. `receivables` - Check permission for write-offs
3. `bookings` - Check permission for modifications

**Example:**
```sql
CREATE POLICY "Only authorized users can refund"
ON payments FOR UPDATE
USING (
  tenant_id = get_user_tenant(auth.uid())
  AND (
    has_role(auth.uid(), tenant_id, 'owner')
    OR user_has_permission(auth.uid(), tenant_id, 'process_refunds')
  )
);
```

---

## **PHASE 4: FUTURE ENHANCEMENTS** (Backlog)

### Task 4.1: Role Management Admin UI
**Priority:** 🔵 LOW  
**Time:** 8 hours

**Features:**
- `/dashboard/admin/roles` page
- List users with current roles
- Assign/revoke roles
- View permissions matrix
- Audit trail

---

### Task 4.2: Feature Flags System
**Priority:** 🔵 LOW  
**Time:** 6 hours

**Components:**
- `feature_flags` table
- `useFeatureFlag()` hook
- Admin toggle UI
- Per-role flag support

---

## 📋 **EXECUTION CHECKLIST**

### Today (Critical)
- [ ] Task 1.1: Seed navigation data
- [ ] Task 1.2: Secure create-payment
- [ ] Task 1.3: Secure complete-checkout
- [ ] Task 1.4: Secure force-checkout
- [ ] Quick test: Login as owner, frontdesk, finance

### Tomorrow (High Priority)
- [ ] Task 2.1: Secure remaining edge functions
- [ ] Task 2.2: Fix route path inconsistency
- [ ] Task 2.3: Full end-to-end testing

### This Week (Medium Priority)
- [ ] Task 3.1: Room assignment UI
- [ ] Task 3.2: Build real widgets
- [ ] Task 3.3: Enhanced RLS policies

### Next Sprint (Future)
- [ ] Task 4.1: Admin UI
- [ ] Task 4.2: Feature flags

---

## 🎯 **DEFINITION OF DONE**

### For Each Task:
- [ ] Code implemented and tested
- [ ] No console errors
- [ ] Security verified (if applicable)
- [ ] Documentation updated
- [ ] Peer reviewed (if team)

### For Overall Project:
- [ ] All navigation items visible per role
- [ ] All edge functions secured
- [ ] All role-specific dashboards functional
- [ ] RLS policies enforce correct access
- [ ] No security warnings from linter
- [ ] Full test coverage across all roles

---

## 🚨 **RISK MITIGATION**

| Risk | Mitigation |
|------|------------|
| Users locked out after role changes | Always keep owner role with full access |
| Edge function failures | Add try-catch, maintain idempotency |
| Database migration issues | Test in staging, use IF NOT EXISTS |
| Performance degradation from RLS | Add indexes on tenant_id, assigned_to |
| Breaking existing functionality | Keep changes additive, test thoroughly |

---

## 📊 **SUCCESS METRICS**

- ✅ 0 unauthorized edge function calls
- ✅ 100% navigation items seeded
- ✅ < 200ms navigation load time
- ✅ 0 role-based access violations
- ✅ 100% test scenario pass rate
- ✅ 0 security linter critical errors

---

## 🎬 **NEXT ACTIONS**

**Immediate (Next 30 minutes):**
1. Run navigation seed SQL
2. Test Sidebar renders navigation
3. Start edge function security (create-payment)

**Within 24 hours:**
1. Complete all edge function security
2. Run full test scenarios
3. Fix any discovered issues

**Within 1 week:**
1. Build room assignment UI
2. Create real widget components
3. Deploy to staging for QA
