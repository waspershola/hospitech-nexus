# Phase 0: QR Room Binding & Dynamic Services Catalog

## ✅ COMPLETED

### Task 0A: Fix QR Room Binding Bug

**Problem:** QR creation failed when `scope='room'` because `assigned_to` was required but not populated.

**Solution Implemented:**
1. **Updated `qrCodeSchema`** in `QRCodeDialog.tsx`:
   - Made `assigned_to` optional
   - Added validation refinement: `assigned_to` is only required when `scope !== 'room'`
   
2. **Added Auto-Population Logic**:
   - Added `useEffect` that watches for `room_id` changes
   - When a room is selected and scope is 'room':
     - Fetches room details from `rooms` table
     - Auto-populates `assigned_to` with `Room {number}` format
   - This happens in real-time as user selects a room

**Files Modified:**
- ✅ `src/components/qr-management/QRCodeDialog.tsx`

**Testing Checklist:**
- [ ] Create QR with `scope=room` + select Room 101 → Should succeed
- [ ] `assigned_to` should auto-populate to "Room 101"
- [ ] Create QR with `scope=common_area` + enter "Pool Area" → Should succeed
- [ ] Create QR with `scope=common_area` + leave blank → Should fail validation

---

### Task 0B: Add Dynamic Services Catalog

**Problem:** Services were hardcoded in the UI, not customizable per tenant.

**Solution Implemented:**
1. **Database Schema** - Created `hotel_qr_services_catalog` table:
   - Tenant-specific service configuration
   - Fields: `service_key`, `service_label`, `category`, `active`, `display_order`, `icon`
   - Full RLS policies (tenant isolation)
   - Default 11 services pre-populated for all tenants

2. **React Hook** - Created `useQRServicesCatalog()`:
   - Fetches active services for current tenant
   - Sorted by `display_order`
   - React Query caching enabled

3. **UI Integration** - Updated `QRCodeDialog.tsx`:
   - Replaced hardcoded `availableServices` array
   - Now uses `useQRServicesCatalog()` hook
   - Loading skeleton while fetching
   - Empty state message if no services configured
   - Services dynamically render from database

**Files Created:**
- ✅ `src/hooks/useQRServicesCatalog.ts`
- ✅ `PHASE_0_QR_SERVICES_CATALOG_MIGRATION.sql` (deployment ready)

**Files Modified:**
- ✅ `src/components/qr-management/QRCodeDialog.tsx`

---

## 🚨 ACTION REQUIRED

### Deploy Database Migration

The migration SQL is ready in `PHASE_0_QR_SERVICES_CATALOG_MIGRATION.sql`.

**Option 1: Execute in Supabase SQL Editor**
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of `PHASE_0_QR_SERVICES_CATALOG_MIGRATION.sql`
3. Execute

**Option 2: Add as Supabase Migration File**
1. Create file: `supabase/migrations/[timestamp]_create_qr_services_catalog.sql`
2. Copy contents from `PHASE_0_QR_SERVICES_CATALOG_MIGRATION.sql`
3. Run `supabase db push` or deploy via CLI

---

## 🎯 SUCCESS CRITERIA

### Task 0A (Room Binding):
- [x] `assigned_to` is optional when `scope='room'`
- [x] Auto-populates from room selection
- [x] Validation enforces `assigned_to` for non-room scopes

### Task 0B (Dynamic Services):
- [x] Database table created with RLS
- [x] React hook fetches services
- [x] UI dynamically renders services
- [ ] **Migration deployed to production**
- [ ] **Services visible in QR creation dialog**
- [ ] **Tenant can customize services via management page (Phase 2 enhancement)**

---

## 📋 TESTING CHECKLIST

### Room Binding Bug Fix:
1. [ ] Open QR Management → Create QR Code
2. [ ] Set Scope = "Room"
3. [ ] Select Room 101 from dropdown
4. [ ] Verify "Assigned To" auto-populates to "Room 101"
5. [ ] Select services and create QR
6. [ ] Verify QR created successfully (no validation errors)

### Dynamic Services:
1. [ ] Deploy migration SQL
2. [ ] Refresh page
3. [ ] Open QR Management → Create QR Code
4. [ ] Scroll to "Available Services" section
5. [ ] Verify 11 default services appear (Digital Menu, WiFi, Room Service, etc.)
6. [ ] Create QR with selected services
7. [ ] Verify services saved correctly in `qr_codes.services` array

### Cross-Tenant Isolation:
1. [ ] Login as Tenant A, create QR with services
2. [ ] Login as Tenant B
3. [ ] Verify Tenant B sees their own service catalog (not Tenant A's)

---

## 🔄 NEXT STEPS (Future Phases)

**Phase 0C (Optional):** Service Catalog Management Page
- Create `/dashboard/settings/qr-services` page
- Allow managers to:
  - Add/edit/delete custom services
  - Reorder services (drag-drop)
  - Toggle active/inactive
  - Change labels and icons

**Phase 1A:** Fix 0% Folio Linkage
**Phase 1B:** Add Missing `tenant_id` Filters

---

## 📝 NOTES

- The `hotel_qr_services_catalog` table is separate from `hotel_services` (used for Add Charge feature)
- Each tenant gets 11 default services on migration
- Services are filtered by `active=true` in the hook
- Future enhancement: build UI to manage this catalog
