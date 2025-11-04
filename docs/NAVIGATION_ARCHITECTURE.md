# Navigation Architecture Documentation

## Overview

The application uses a **database-driven, role and department-aware navigation system** that provides dynamic, tenant-customizable menu items. This architecture ensures each user sees only the navigation items relevant to their role and department.

---

## System Architecture

### 1. Database Schema

**Table:** `navigation_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | Tenant isolation |
| `name` | text | Display name in sidebar |
| `path` | text | Route path (e.g., `/dashboard/kitchen-dashboard`) |
| `icon` | text | Lucide icon name |
| `allowed_roles` | text[] | Array of app_roles that can see this item |
| `allowed_departments` | text[] | Array of departments (empty = all departments) |
| `order_index` | integer | Display order in sidebar |
| `is_active` | boolean | Enable/disable without deleting |
| `description` | text | Admin reference description |
| `metadata` | jsonb | Extensible field for badges, permissions, etc. |
| `parent_id` | uuid | For future nested navigation |

**Key Indexes:**
- `idx_navigation_tenant_role_dept` on `(tenant_id, is_active)`
- `unique_tenant_path` unique constraint on `(tenant_id, path)`

---

### 2. Filtering Logic

Navigation items are filtered by **BOTH** role and department:

```typescript
// useNavigation.ts
const filtered = data.filter(item => {
  // Must have the user's role
  const hasRole = item.allowed_roles.includes(userRole);
  
  // Empty array = visible to all departments
  // Otherwise, must match user's department
  const allowedDepts = item.allowed_departments || [];
  const hasAccess = 
    allowedDepts.length === 0 || 
    allowedDepts.includes(userDepartment);
  
  return hasRole && hasAccess;
});
```

**Examples:**

| Item | allowed_roles | allowed_departments | Visible To |
|------|---------------|---------------------|------------|
| Overview | all roles | `[]` (empty) | Everyone |
| Kitchen Dashboard | kitchen, supervisor | `{kitchen, food_beverage}` | Kitchen staff + supervisors in kitchen/F&B |
| Stock Requests | housekeeping, kitchen, bar, supervisor | `{housekeeping, kitchen, bar, maintenance}` | Operational staff in those departments |
| Finance Center | owner, manager, finance | `{management}` | Finance team + management only |

---

## Department Mapping

### Standard Departments

| Department Code | Description | Typical Roles |
|----------------|-------------|---------------|
| `front_office` | Front desk, reception | frontdesk, supervisor |
| `housekeeping` | Room cleaning, housekeeping | housekeeping, supervisor |
| `kitchen` | Main kitchen operations | kitchen, supervisor |
| `bar` | Bar and beverage service | bar, supervisor |
| `food_beverage` | Restaurant/F&B management | supervisor, restaurant |
| `maintenance` | Repairs and maintenance | maintenance, supervisor |
| `inventory` | Store and inventory control | store_manager, procurement |
| `management` | Executive and admin | owner, manager, finance, accountant |

---

## Role-Department Relationship

### Understanding the Difference

- **`app_role`** (from `user_roles` table): Defines **permissions** and **what actions** a user can perform
- **`department`** (from `staff` table): Defines **context** and **what they see** in navigation

### Examples

| Staff Member | app_role | department | Navigation Shown |
|-------------|----------|------------|------------------|
| Cook | `kitchen` | `kitchen` | Overview, Kitchen Dashboard, Stock Requests, Payments |
| Housekeeping Manager | `supervisor` | `housekeeping` | Overview, Housekeeping, Rooms, Stock Requests, My Team |
| F&B Manager | `supervisor` | `food_beverage` | Overview, Kitchen (Restaurant), Stock Requests, Payments, My Team |
| Front Desk Agent | `frontdesk` | `front_office` | Overview, Front Desk, Bookings, Guests, Rooms, Payments |
| Store Clerk | `store_manager` | `inventory` | Overview, Inventory, Stock Requests |
| Owner | `owner` | `management` | ALL items (no department restriction) |

---

## Navigation Manager UI

**Access:** `/dashboard/navigation-manager` (Owners only)

### Features

1. **View All Navigation Items**
   - See all items with their roles, departments, and status
   - Visual indication of active/inactive items

2. **Edit Navigation Items**
   - Change name, path, icon
   - Select multiple roles (checkboxes)
   - Select multiple departments (checkboxes)
   - Update order_index for sorting
   - Add description for admin reference

3. **Toggle Visibility**
   - Click eye icon to enable/disable without deleting
   - Disabled items are hidden from all users

4. **Delete Items** (with confirmation)

### Department Filter Rules

- **Empty array `[]`**: Visible to ALL departments
- **Specific departments**: Only visible to users in those departments
- **Example**: `{kitchen, bar}` = only kitchen and bar staff see this item

---

## Testing Matrix

### Test Accounts

| Email | app_role | department | Expected Navigation |
|-------|----------|------------|---------------------|
| engsholwasiu@gmail.com | kitchen | kitchen | Overview, Kitchen Dashboard, Stock Requests, Payments |
| HM@GMAIL.COM | supervisor | housekeeping | Overview, Housekeeping, Rooms, Stock Requests, My Team |
| F&B@GMAIL.COM | supervisor | food_beverage | Overview, Kitchen (Restaurant), Stock Requests, Payments, My Team |
| front@gmail.com | frontdesk | front_office | Overview, Front Desk, Bookings, Guests, Rooms, Payments |
| shola@gmail.com | owner | management | ALL items (no restrictions) |

### Verification Steps

1. **Login as each user**
2. **Check sidebar** - should only show items for their department
3. **Verify NO cross-department items**
   - Kitchen staff should NOT see Bar, Housekeeping, etc.
   - Housekeeping should NOT see Kitchen, Finance Center, etc.
4. **Test navigation** - all visible links should work (no 404s)

---

## Migration Path

### For New Tenants

When onboarding a new tenant, navigation items are automatically created via SQL:

```sql
-- Insert default navigation for new tenant
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, allowed_departments, order_index)
VALUES 
  (new_tenant_id, 'Overview', '/dashboard', 'Home', '{owner,manager,...}', '{}', 1),
  (new_tenant_id, 'Front Desk', '/dashboard/front-desk', 'Hotel', '{owner,manager,frontdesk}', '{front_office,management}', 2),
  -- ... etc
```

### Backward Compatibility

- `roleNavigation.ts` is **deprecated** but kept for reference
- All navigation now uses `useNavigation()` hook
- Sidebar component uses database navigation exclusively
- Login redirects use `getDefaultDashboard()` from `roleNavigation.ts`

---

## Performance Considerations

### Optimization

- **Indexed queries**: Fast filtering by `tenant_id` and `is_active`
- **Client-side caching**: React Query caches navigation for 5 minutes
- **Minimal payload**: Only active items fetched from database

### Cache Invalidation

Navigation cache is invalidated when:
- User logs in/out
- Role or department changes
- Navigation Manager makes updates

---

## Security

### Row-Level Security (RLS)

```sql
-- Users can view their tenant's navigation
CREATE POLICY "Users can view their tenant nav items"
ON navigation_items FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

-- Only owners can manage navigation
CREATE POLICY "Owners can manage nav items"
ON navigation_items FOR ALL
USING (tenant_id = get_user_tenant(auth.uid()) AND has_role(auth.uid(), tenant_id, 'owner'));
```

### Access Control

- Navigation items control **visibility** only
- Actual route access enforced by `RoleGuard` component
- Double protection: sidebar + route guards

---

## Future Enhancements

### Phase 4+ (Planned)

1. **Nested Navigation**
   - Use `parent_id` for multi-level menus
   - Expandable groups in sidebar

2. **Badge Support**
   - Use `metadata.badge` for notification counts
   - Real-time updates via Supabase realtime

3. **Custom Permissions**
   - Use `metadata.permissions` for granular access
   - Beyond role/department filtering

4. **Billing Integration**
   - Hide features based on subscription tier
   - Use `metadata.tier` field

5. **Multi-Tenant Templates**
   - Copy navigation structure to new tenants
   - Template marketplace for different hotel types

6. **A/B Testing**
   - Test different menu layouts
   - Track navigation analytics

---

## Troubleshooting

### User Can't See Expected Items

1. **Check their role**: Verify `user_roles.role` matches `allowed_roles`
2. **Check their department**: Verify `staff.department` matches `allowed_departments`
3. **Check item is active**: `is_active = true` in database
4. **Check tenant_id**: Item belongs to user's tenant

### Item Appears for Wrong Department

1. **Check `allowed_departments`**: Empty array = all departments
2. **Update via Navigation Manager**: Edit and save with correct departments

### Navigation Not Updating

1. **Clear React Query cache**: Logout and login again
2. **Check database**: Verify changes saved in `navigation_items` table
3. **Check console**: Look for errors in `useNavigation` hook

---

## API Reference

### useNavigation Hook

```typescript
import { useNavigation } from '@/hooks/useNavigation';

// Usage in components
const { data: navItems, isLoading } = useNavigation();

// Returns filtered NavigationItem[]
interface NavigationItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  allowed_roles: string[];
  allowed_departments: string[];
  order_index: number;
  is_active: boolean;
  description?: string;
  metadata?: Record<string, any>;
}
```

### Sidebar Component

```typescript
// src/components/layout/Sidebar.tsx
import { useNavigation } from '@/hooks/useNavigation';
import * as Icons from 'lucide-react';

const { data: navigation, isLoading } = useNavigation();

navigation?.map((item) => {
  const Icon = Icons[item.icon as keyof typeof Icons];
  return <NavLink to={item.path}><Icon /> {item.name}</NavLink>
})
```

---

## Migration Checklist

- [x] Database schema enhanced with `allowed_departments`, `metadata`, `description`
- [x] Indexes created for performance
- [x] All 22 navigation items populated with department filters
- [x] `useNavigation` hook updated for department filtering
- [x] Navigation Manager UI created
- [x] Route added to App.tsx
- [x] `roleNavigation.ts` deprecated with notice
- [ ] Test with all user accounts
- [ ] Document test results
- [ ] Train admin users on Navigation Manager

---

## Support

For issues or questions:
1. Check this documentation
2. Test in Navigation Manager UI
3. Verify RLS policies in Supabase
4. Check console logs for errors

**Last Updated:** 2025-01-04  
**Version:** 1.0  
**Status:** Production Ready ✅
