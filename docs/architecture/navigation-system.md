# Navigation System Architecture

**Last Updated:** 2025-11-05  
**Status:** ✅ Active  
**System:** Database-Driven (navigation_items table)

## Overview
All navigation menus are dynamically loaded from the `navigation_items` table, filtered by tenant, role, and department. This enables tenant-specific customization and eliminates hard-coded navigation logic.

## Active Implementation

### Core Components
- **Hook:** `useNavigation()` (`src/hooks/useNavigation.ts`)
- **Database Table:** `navigation_items`
- **UI Component:** `Sidebar.tsx` (`src/components/layout/Sidebar.tsx`)
- **Admin Interface:** Navigation Manager (`/dashboard/navigation-manager`)

### Data Flow
```
User Login → AuthContext gets role/department → useNavigation() queries DB
→ Filters by tenant_id + role + department → Sidebar renders nav items
```

## Deprecated Systems (DO NOT USE)

❌ **DELETED (2025-11-05):**
- `src/lib/roleNavigation.ts` - Hard-coded navigation mappings
- `src/hooks/useRoleNavigation.ts` - Code-based navigation hook
- Hard-coded role-to-dashboard mapping in `Login.tsx`

**Why Deprecated:**
- Not tenant-customizable
- Required code changes for menu updates
- Duplicate logic with database system
- Department filtering not properly supported

## Access Control

### Role Filtering
Navigation items include an `allowed_roles[]` column:
```typescript
allowed_roles: ['owner', 'manager', 'frontdesk']
```
Users only see items that include their role.

### Department Filtering
Navigation items include an `allowed_departments[]` column:
```typescript
allowed_departments: ['housekeeping', 'maintenance']
// Empty array = visible to all departments
allowed_departments: []
```

### Route Guards
- **Navigation Visibility:** Controlled by `navigation_items` table
- **Route Protection:** Enforced by `RoleGuard` component in `App.tsx`
- These are independent systems - hiding a menu item doesn't protect the route

## Database Schema

```sql
CREATE TABLE navigation_items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT NOT NULL,
  allowed_roles TEXT[] NOT NULL,
  allowed_departments TEXT[] DEFAULT '{}',
  parent_id UUID REFERENCES navigation_items(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Migration Notes

### For New Tenants
All new tenants must have navigation items seeded in the `navigation_items` table. Use the seeding script in `scripts/seed-navigation.sql` (to be created).

### For Existing Tenants
Run verification query to ensure all tenants have navigation items:
```sql
SELECT 
  t.name as tenant,
  COUNT(ni.id) as nav_items
FROM tenants t
LEFT JOIN navigation_items ni ON ni.tenant_id = t.id
GROUP BY t.id, t.name
HAVING COUNT(ni.id) = 0;
```

### ESLint Protection
The project includes ESLint rules to prevent accidental imports of deprecated navigation modules. Any attempt to import `@/lib/roleNavigation` or `@/hooks/useRoleNavigation` will break the build with a clear error message.

## Customization

### Adding New Navigation Items
Use the Navigation Manager UI at `/dashboard/navigation-manager`:
1. Navigate to Configuration → Navigation Manager
2. Click "Add Navigation Item"
3. Set name, path, icon, allowed roles, and departments
4. Set order_index for menu position
5. Toggle is_active to show/hide

### Tenant-Specific Menus
Each tenant can have completely different navigation structures:
- Different menu items
- Different order
- Different department visibility
- Custom icons and labels

## Troubleshooting

### Users Not Seeing Expected Items
1. Check `navigation_items` table for tenant
2. Verify `allowed_roles` includes user's role
3. Check `allowed_departments` (empty = all departments)
4. Confirm `is_active = true`

### Navigation Not Updating
1. Clear React Query cache (refresh browser)
2. Check RLS policies on `navigation_items`
3. Verify tenant_id matches user's tenant

### F&B Department Issues
F&B has hierarchy:
- F&B (parent department)
  - Bar
  - Kitchen
  - Restaurant

Items should either:
- Include all F&B sub-departments: `['bar', 'kitchen', 'restaurant']`
- Or leave empty for all departments: `[]`

## Performance

### Query Optimization
- Indexed on `tenant_id`, `is_active`, `order_index`
- Client-side caching via React Query
- Single query per navigation load

### Cache Invalidation
Navigation cache is invalidated when:
- User logs in/out
- Navigation items are modified
- Tenant/role/department changes

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
USING (tenant_id = get_user_tenant(auth.uid()) 
   AND has_role(auth.uid(), tenant_id, 'owner'));
```

### Important Note
Navigation controls **visibility**, not **access**. Always use `RoleGuard` to protect routes:
```tsx
<Route path="/dashboard/finance" element={
  <RoleGuard allowedRoles={['owner', 'manager']}>
    <FinanceCenter />
  </RoleGuard>
} />
```

## Future Enhancements

### Planned Features
- [ ] Nested navigation (multi-level menus)
- [ ] Badge support (notification counts)
- [ ] Custom permissions per item
- [ ] Navigation templates for quick tenant setup
- [ ] A/B testing for menu layouts

### Migration Checklist
- [x] Database schema created
- [x] `useNavigation()` hook implemented
- [x] Sidebar integrated with database
- [x] Navigation Manager UI built
- [x] RLS policies configured
- [x] Deprecated files deleted
- [x] ESLint protection added
- [x] Documentation complete
- [ ] Seeding script for new tenants
- [ ] Migration script for existing tenants

## Support

For detailed implementation guide, see:
- `/docs/NAVIGATION_ARCHITECTURE.md` - Comprehensive documentation
- `/analysis/role-system-implementation-status.md` - Implementation status

For questions or issues:
1. Check troubleshooting section above
2. Review Navigation Manager UI
3. Verify database navigation items
4. Check console for React Query errors
