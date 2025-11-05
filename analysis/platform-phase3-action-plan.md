# Platform Management - Phase 3 Implementation Plan

## 🎯 Objective
Complete the core platform features to achieve full platform management capability as defined in the PRD.

---

## 📦 Phase 3: Core Platform Completion

**Timeline:** 1-2 weeks  
**Priority:** CRITICAL  
**Goal:** Make the platform operationally complete for billing, navigation, and tenant management

---

## 1️⃣ Unified Navigation System (CRITICAL - Day 1-2)

### Why This First?
- **CRITICAL ISSUE:** Current system has navigation duplicated between `navigation_items` table and code
- PRD mandates single source of truth
- Blocks proper tenant customization
- Prevents dynamic navigation updates

### Tasks

#### 1.1 Create Platform Nav Sync Edge Function (4h)
**File:** `supabase/functions/platform-nav-sync/index.ts`

```typescript
// Endpoints:
// GET /platform-nav-sync?tenant_id={id} - fetch nav
// POST /platform-nav-sync - create/update nav items (admin only)
// DELETE /platform-nav-sync/{id} - delete nav item
```

**Features:**
- Fetch platform nav items for tenant (with inheritance)
- Tenant-specific overrides
- Global fallback navigation
- Role & department filtering
- Real-time cache invalidation

#### 1.2 Seed Default Platform Navigation (1h)
**File:** `supabase/migrations/seed-platform-nav.sql`

Create default nav items in `platform_nav_items`:
- Dashboard (all roles)
- Front Desk (front_desk, receptionist, manager, owner)
- Bookings (all roles)
- Guests (all roles)
- Rooms (manager, owner)
- Finance Center (owner, manager, finance, accountant)
- Configuration Center (owner, manager)
- Reports (owner, manager, finance)
- Staff (owner, manager, supervisor)
- Inventory (store_manager, owner, manager)
- etc.

#### 1.3 Refactor useNavigation Hook (2h)
**File:** `src/hooks/useNavigation.ts`

```typescript
// Current: reads from navigation_items table
// New: calls platform-nav-sync edge function
// Features:
// - Cache results in React Query
// - Real-time updates via Supabase realtime
// - Role-based filtering on client
```

#### 1.4 Migration Script (1h)
**File:** `supabase/functions/migrate-navigation/index.ts`

- Copy all `navigation_items` → `platform_nav_items`
- Map tenant_id correctly
- Validate integrity
- Soft deprecate old table (add warning comment)

**Deliverables:**
- ✅ Platform nav edge function
- ✅ Default nav seeded
- ✅ useNavigation refactored
- ✅ Migration completed
- ✅ Old navigation_items deprecated

**Testing:**
- Platform admin can add/edit nav items
- Tenant sees correct navigation
- Role filtering works
- Tenant overrides work

---

## 2️⃣ Billing System (HIGH PRIORITY - Day 3-5)

### Why Critical?
- Revenue tracking
- SMS overage billing
- Automated invoicing
- Plan compliance

### Tasks

#### 2.1 Usage Tracking Edge Function (4h)
**File:** `supabase/functions/platform-usage-sync/index.ts`

**Triggers:**
- Daily cron job
- On-demand via API call

**Logic:**
```typescript
// For each tenant:
// 1. Count total rooms
// 2. Count bookings this month
// 3. Count SMS sent (from platform_audit_stream)
// 4. Count API calls (if tracked)
// 5. Update platform_usage table
// 6. Check against plan limits
// 7. Emit alert if exceeded
```

#### 2.2 Billing Cycle Edge Function (6h)
**File:** `supabase/functions/platform-billing-cycle/index.ts`

**Triggers:**
- Monthly cron (1st of month)
- Manual via platform admin UI

**Logic:**
```typescript
// For each active tenant:
// 1. Get plan from platform_plans
// 2. Get usage from platform_usage
// 3. Calculate base charge (plan price)
// 4. Calculate overages:
//    - SMS: (sms_used - plan.included_sms) * sms_rate
//    - Rooms: if rooms_total > plan.max_rooms
// 5. Create invoice in platform_billing
// 6. Update status = 'pending'
// 7. Send invoice email
// 8. Log to platform_audit_stream
```

#### 2.3 Platform Admin - Billing Tab (4h)
**Files:**
- `src/hooks/usePlatformBilling.ts`
- `src/pages/dashboard/platform/tabs/PlatformBillingTab.tsx`

**Features:**
- Billing overview (total revenue, pending, overdue)
- Invoice list (all tenants)
- Invoice details modal
- Manual invoice generation
- Payment recording
- Overage reports
- Export to CSV

#### 2.4 Tenant Billing Page (2h)
**Files:**
- `src/hooks/useTenantBilling.ts`
- `src/pages/dashboard/Billing.tsx`

**Features:**
- Current plan details
- Invoice history
- Payment status
- Current usage stats
- SMS credits remaining
- Upgrade plan CTA

**Deliverables:**
- ✅ Usage sync function
- ✅ Billing cycle automation
- ✅ Platform billing UI
- ✅ Tenant billing page
- ✅ Invoice email template
- ✅ Cron jobs configured

**Testing:**
- Run billing cycle manually
- Verify invoice created
- Check SMS overage calculation
- Test email delivery
- Tenant can view invoices

---

## 3️⃣ Plans Management (Day 6-7)

### Why Important?
- Tiered pricing model
- Feature gating
- Trial management
- Upsell opportunities

### Tasks

#### 3.1 Platform Plans Hook (2h)
**File:** `src/hooks/usePlatformPlans.ts`

```typescript
// CRUD operations for plans
// - fetchPlans()
// - createPlan()
// - updatePlan()
// - deletePlan()
// - assignPlanToTenant()
```

#### 3.2 Platform Admin - Plans Tab (4h)
**File:** `src/pages/dashboard/platform/tabs/PlatformPlansTab.tsx`

**Features:**
- List all plans
- Create plan form
  - Name, price, billing period
  - Included SMS credits
  - Max rooms, max staff
  - Trial days
  - Feature flags (JSONB editor)
- Edit existing plan
- Activate/deactivate plan
- View tenants on this plan

#### 3.3 Plan Assignment Logic (2h)
**File:** `supabase/functions/assign-plan/index.ts`

```typescript
// POST /assign-plan
// {
//   tenant_id: string
//   plan_id: string
//   apply_pro_rata: boolean
// }
// 
// Logic:
// 1. Get old plan & new plan
// 2. Calculate pro-rata if mid-cycle
// 3. Update platform_tenants.plan_id
// 4. Create billing adjustment
// 5. Update feature access
// 6. Log audit event
```

#### 3.4 Plan Limits Enforcement (2h)
**File:** `src/lib/planLimits.ts`

```typescript
// Utility functions:
// - checkRoomLimit(tenant_id)
// - checkStaffLimit(tenant_id)
// - checkSMSLimit(tenant_id)
// - canAccessFeature(tenant_id, feature_key)
//
// Used before operations:
// - Creating room → check limit
// - Adding staff → check limit
// - Sending SMS → check limit
```

**Deliverables:**
- ✅ Plans CRUD hook
- ✅ Plans management UI
- ✅ Plan assignment function
- ✅ Limit enforcement utilities
- ✅ Upgrade/downgrade flow

**Testing:**
- Create new plan
- Assign to tenant
- Verify limits enforced
- Test pro-rata calculation
- Check feature flags work

---

## 4️⃣ Complete Tenant Lifecycle (Day 8-9)

### Why Important?
- Automate onboarding
- Tenant management
- Suspension/reactivation

### Tasks

#### 4.1 Tenant CRUD Edge Functions (4h)
**File:** `supabase/functions/tenant-management/index.ts`

**Endpoints:**
```typescript
// POST /tenant-management/create
// PATCH /tenant-management/{id}
// DELETE /tenant-management/{id} (soft delete)
// POST /tenant-management/{id}/suspend
// POST /tenant-management/{id}/activate
```

**Create Flow:**
```typescript
// 1. Validate domain uniqueness
// 2. Create tenant in platform_tenants
// 3. Assign default plan
// 4. Seed default nav items (copy from platform defaults)
// 5. Create default admin user
// 6. Allocate trial SMS credits
// 7. Send welcome email
// 8. Log audit event
```

#### 4.2 Enhanced Tenants Tab UI (3h)
**File:** `src/pages/dashboard/platform/tabs/PlatformTenantsTab.tsx` (enhance)

**Add:**
- Tenant creation wizard (modal)
- Tenant detail drawer
  - Owner info
  - Plan details
  - Settings editor (JSONB)
  - Status controls (suspend/activate/delete)
  - Domain configuration
  - Usage stats
- Bulk actions
- Search & filters

#### 4.3 Onboarding Automation (3h)
**File:** `supabase/functions/onboard-tenant/index.ts`

```typescript
// Called after signup or manual creation
// 1. Validate tenant data
// 2. Provision infrastructure:
//    - Create DB rows
//    - Set up default rooms/categories
//    - Seed navigation
//    - Create welcome booking (optional)
// 3. Email: welcome + setup guide
// 4. SMS: test message to verify
// 5. Create support ticket: "Welcome! Need help?"
```

#### 4.4 Tenant Dashboard Widget (2h)
**File:** `src/components/TenantStatusWidget.tsx`

For tenant dashboard - show:
- Current plan
- Usage this month
- SMS credits remaining
- Billing status
- Upgrade CTA if near limits

**Deliverables:**
- ✅ Tenant CRUD functions
- ✅ Enhanced tenants UI
- ✅ Onboarding automation
- ✅ Tenant status widget
- ✅ Welcome email template

**Testing:**
- Create new tenant via UI
- Verify all data seeded
- Check welcome email sent
- Tenant can log in
- Default nav appears

---

## 📊 Phase 3 Success Metrics

### Functional
- [ ] Platform admin can create tenants end-to-end
- [ ] Navigation loads from platform_nav_items only
- [ ] Billing runs automatically on 1st of month
- [ ] Plans can be created and assigned
- [ ] Limits are enforced correctly
- [ ] Onboarding is fully automated

### Technical
- [ ] Zero navigation_items reads (deprecated)
- [ ] All billing in platform_billing
- [ ] SMS credits tracked accurately
- [ ] Audit logs for all admin actions
- [ ] No console errors

### Business
- [ ] Can track MRR (Monthly Recurring Revenue)
- [ ] Can see tenant health at a glance
- [ ] Can customize navigation per tenant
- [ ] Trial-to-paid conversion measurable
- [ ] Overage billing working

---

## 🚀 Deployment Checklist

Before going live with Phase 3:

### Pre-deployment
- [ ] All edge functions deployed
- [ ] Database migrations run
- [ ] Cron jobs scheduled
- [ ] Email templates configured
- [ ] Default plans seeded
- [ ] Platform nav items seeded

### Testing
- [ ] Create test tenant
- [ ] Run billing cycle
- [ ] Verify invoice created
- [ ] Test plan limits
- [ ] Check email delivery
- [ ] Navigation loads correctly

### Monitoring
- [ ] Platform admin can access all tabs
- [ ] No errors in edge function logs
- [ ] Billing cron runs successfully
- [ ] Usage sync working

### Rollback Plan
- [ ] Keep navigation_items table (don't drop)
- [ ] Can switch back to old nav hook
- [ ] Billing can be run manually if cron fails

---

## 🎓 Developer Handoff Notes

### New Patterns Introduced
1. **Platform-scoped operations** - always check `is_platform_admin()`
2. **Tenant isolation** - all operations validate tenant_id
3. **Audit everything** - log to platform_audit_stream
4. **Credit pools** - check before operation, deduct after

### Key Files
```
supabase/functions/
├── platform-nav-sync/          # Navigation API
├── platform-usage-sync/        # Usage tracking
├── platform-billing-cycle/     # Billing automation
├── assign-plan/                # Plan assignment
├── tenant-management/          # Tenant CRUD
└── onboard-tenant/             # Onboarding

src/
├── hooks/
│   ├── usePlatformPlans.ts
│   ├── usePlatformBilling.ts
│   └── useTenantBilling.ts
├── pages/dashboard/platform/tabs/
│   ├── PlatformBillingTab.tsx
│   └── PlatformPlansTab.tsx
└── lib/
    └── planLimits.ts
```

### Environment Variables
```bash
# Add to edge function secrets:
STRIPE_SECRET_KEY=sk_...  # If using Stripe
SENDGRID_API_KEY=SG...    # For emails
S3_BUCKET=backups-prod    # For backups (Phase 4)
```

---

## 📅 Timeline Summary

| Day | Focus | Hours | Deliverable |
|-----|-------|-------|-------------|
| 1 | Navigation System | 8h | Unified nav working |
| 2 | Navigation Migration | 4h | Old nav deprecated |
| 3 | Usage Tracking | 4h | Platform usage syncing |
| 4 | Billing Cycle | 6h | Auto-billing working |
| 5 | Billing UI | 6h | Billing tabs complete |
| 6 | Plans Management | 8h | Plans CRUD + UI |
| 7 | Plan Limits | 4h | Enforcement working |
| 8 | Tenant Lifecycle | 8h | CRUD + UI |
| 9 | Onboarding | 4h | Full automation |
| **Total** | **Phase 3** | **52h** | **Core Complete** |

---

## ✅ Acceptance Criteria

### Phase 3 is complete when:

1. **Navigation**
   - ✅ All nav loads from platform_nav_items
   - ✅ Platform admin can edit nav via UI
   - ✅ Tenant overrides work
   - ✅ Old navigation_items deprecated

2. **Billing**
   - ✅ Billing runs automatically monthly
   - ✅ Invoices created correctly
   - ✅ SMS overage calculated
   - ✅ Platform admin can view all invoices
   - ✅ Tenants can view their invoices

3. **Plans**
   - ✅ Plans can be created via UI
   - ✅ Plans can be assigned to tenants
   - ✅ Limits are enforced
   - ✅ Feature flags control access

4. **Tenants**
   - ✅ Tenants can be created via UI
   - ✅ Onboarding is automatic
   - ✅ Status can be changed (suspend/activate)
   - ✅ Usage tracked per tenant

---

**Ready to start Phase 3? Let me know which task to begin with!**

Options:
1. Start with Navigation System (recommended - most critical)
2. Start with Billing System (revenue focused)
3. Start with Plans Management (business model)
4. Start with something else (specify)
