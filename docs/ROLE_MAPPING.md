# Staff Role System Documentation

## Overview
This system uses a dual-layer architecture to manage staff roles and permissions:
- **Staff Table (`staff`)**: Stores detailed job information including granular job titles
- **User Roles Table (`user_roles`)**: Maps users to application-level roles for permission control

## Department Validation

### Valid Departments (Enum)
The system enforces department validation at the database level using the `department_type` enum:

```sql
-- Valid department values
- front_office
- housekeeping  
- maintenance
- food_beverage
- kitchen
- bar
- finance
- management
- security
- spa
- concierge
- admin
```

### Department Labels (Frontend)
```typescript
const DEPARTMENT_LABELS = {
  front_office: 'Front Office',
  housekeeping: 'Housekeeping',
  maintenance: 'Maintenance',
  food_beverage: 'Food & Beverage',
  kitchen: 'Kitchen',
  bar: 'Bar',
  finance: 'Finance',
  management: 'Management',
  security: 'Security',
  spa: 'Spa & Wellness',
  concierge: 'Concierge',
  admin: 'Administration',
};
```

## Role Mapping System

### How It Works
When a staff member is invited or created:
1. Their granular `role` (e.g., "cook", "receptionist") is stored in the `staff` table
2. The system maps this to an `app_role` (e.g., "restaurant", "frontdesk") 
3. The `app_role` is stored in `user_roles` for permission checks
4. Navigation and features are controlled by the `app_role`

### Mapping Logic

#### Direct Role Mappings
```typescript
// Exact role match (case-insensitive)
'owner' → 'owner'
'manager' → 'manager'
'accountant' → 'accountant'
'bartender' → 'bar'
'barman' → 'bar'
```

#### Department-Based Mappings
When no direct match exists, department determines the app role:

```typescript
department === 'front_office' → 'frontdesk'
department === 'housekeeping' → 'housekeeping'
department === 'maintenance' → 'maintenance'
department === 'food_beverage' → 'restaurant'
department === 'kitchen' → 'restaurant'
department === 'bar' → 'bar'
department === 'finance' → 'finance'
department === 'management' → 'manager'
department === 'security' → 'frontdesk'
department === 'spa' → 'frontdesk'
department === 'concierge' → 'frontdesk'
department === 'admin' → 'manager'
```

#### Default Fallback
```typescript
// If no match found, use role as-is or default to 'frontdesk'
default → role.toLowerCase() || 'frontdesk'
```

## Supervisor Validation

The system enforces supervisor relationships at the database level:

### Validation Rules
1. **Supervisor Must Exist**: The supervisor must be a valid staff member in the same tenant
2. **Department Match**: Supervisor must be in the same department OR in 'management'
3. **Leadership Role**: Supervisor must have one of these roles:
   - manager
   - supervisor
   - head
   - director
   - assistant_manager
   - chief

### Example Scenarios

✅ **Valid**: A 'receptionist' in 'front_office' reports to a 'supervisor' in 'front_office'
✅ **Valid**: A 'cook' in 'kitchen' reports to a 'manager' in 'management'
❌ **Invalid**: A 'receptionist' in 'front_office' reports to a 'supervisor' in 'housekeeping'
❌ **Invalid**: A 'cook' in 'kitchen' reports to a 'receptionist' (not a leadership role)

## Permission System

### Application Roles (app_role enum)
```typescript
- owner       // Full access
- manager     // Manage operations
- frontdesk   // Reception, check-in/out
- housekeeping // Room management
- finance     // Financial operations
- maintenance // Property maintenance
- restaurant  // Food service
- bar         // Bar operations
- accountant  // Financial reporting
- supervisor  // Department oversight
```

### Permission Checks
```typescript
// In components/hooks:
const { can } = useRole();

// Check single permission
if (can(PERMISSIONS.FINANCIAL.RECORD_PAYMENT)) {
  // Allow payment recording
}

// Check department access
if (canManageDepartment('kitchen')) {
  // Allow kitchen management
}
```

## Staff Creation Flow

### 1. Invite Staff (with email invitation)
```typescript
POST /invite-staff
{
  email: "staff@hotel.com",
  full_name: "John Doe",
  role: "receptionist",
  department: "front_office",
  supervisor_id: "uuid-of-supervisor",
  generate_password: false // Send email invite
}
```

**Process**:
1. Validates department against enum
2. Validates supervisor if provided
3. Creates invitation record with secure token
4. Sends email with onboarding link
5. Staff completes registration via `/auth/onboard?token=xxx`

### 2. Direct Staff Creation (with generated password)
```typescript
POST /invite-staff
{
  email: "staff@hotel.com",
  full_name: "John Doe", 
  role: "receptionist",
  department: "front_office",
  supervisor_id: "uuid-of-supervisor",
  generate_password: true // Create immediately
}
```

**Process**:
1. Validates department against enum
2. Validates supervisor if provided
3. Creates auth.users account with generated password
4. Maps role to app_role and creates user_roles record
5. Creates staff record
6. Returns generated password to administrator
7. Staff must change password on first login

## Metadata Storage

The `staff` table includes a JSONB `metadata` field for extended information:

```typescript
{
  employee_id: "EMP-2025-001",
  date_of_birth: "1990-01-15",
  hire_date: "2025-01-01",
  national_id: "123456789",
  bank_account: "1234567890",
  bank_name: "Example Bank",
  salary: 50000,
  education: "Bachelor's Degree",
  certifications: ["Food Safety", "First Aid"],
  notes: "Excellent performance"
}
```

## Best Practices

### For Administrators
1. Always assign supervisors within the same department or from management
2. Ensure supervisors have appropriate leadership roles
3. Use the invitation system for better security (no password exposure)
4. Keep job titles in `staff.role` descriptive and consistent
5. Let the system handle app_role mapping automatically

### For Developers
1. Always use `useRole()` hook for permission checks
2. Never bypass role validation in edge functions
3. Always validate department against the enum
4. Test supervisor validation edge cases
5. Use `PERMISSIONS` constants, never hardcode permission strings

## Security Considerations

1. **Tenant Isolation**: All staff queries filter by `tenant_id`
2. **RLS Policies**: Row-level security enforces access control
3. **Edge Function Auth**: All staff operations require valid JWT
4. **Supervisor Validation**: Database trigger prevents invalid supervisor assignments
5. **Department Validation**: Enum constraint prevents typos and invalid departments
6. **Role Separation**: Staff roles are separate from permission roles

## Troubleshooting

### Common Issues

**Issue**: "Supervisor must be in the same department"
- **Fix**: Assign a supervisor from the same department or from 'management'

**Issue**: "Supervisor must have a leadership role"  
- **Fix**: Assign a supervisor with role: manager, supervisor, head, director, assistant_manager, or chief

**Issue**: "Invalid department"
- **Fix**: Use only the valid department enum values listed above

**Issue**: Staff can't access their dashboard
- **Fix**: Check `user_roles` table to ensure app_role was mapped correctly

**Issue**: Role mapping not working
- **Fix**: Review the `mapStaffRoleToAppRole()` function in `invite-staff` edge function
