-- PHASE 1: Staff Management Database Schema

-- Create staff table with department and role hierarchy
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT CHECK (department IN (
    'front_office', 'housekeeping', 'food_beverage', 'kitchen',
    'inventory', 'maintenance', 'security', 'accounts', 'hr', 'management'
  )),
  role TEXT CHECK (role IN (
    'owner', 'general_manager', 'manager', 'supervisor',
    'receptionist', 'guest_service_agent', 'room_attendant',
    'waiter', 'bartender', 'cook', 'store_clerk',
    'technician', 'cashier', 'admin_officer', 'frontdesk',
    'housekeeping', 'maintenance', 'finance', 'accountant', 'restaurant', 'bar'
  )),
  supervisor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  branch TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Enable RLS on staff table
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access staff in their tenant
CREATE POLICY "staff_tenant_access" ON staff
  FOR ALL USING (tenant_id = get_user_tenant(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_staff_tenant_department ON staff(tenant_id, department);
CREATE INDEX idx_staff_supervisor ON staff(supervisor_id);
CREATE INDEX idx_staff_user_id ON staff(user_id);

-- Create staff_activity table for audit trail
CREATE TABLE IF NOT EXISTS staff_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  department TEXT,
  role TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on staff_activity
ALTER TABLE staff_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_activity
CREATE POLICY "activity_tenant_read" ON staff_activity
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "activity_insert" ON staff_activity
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- Indexes for staff_activity
CREATE INDEX idx_staff_activity_tenant ON staff_activity(tenant_id, timestamp DESC);
CREATE INDEX idx_staff_activity_staff ON staff_activity(staff_id, timestamp DESC);
CREATE INDEX idx_staff_activity_department ON staff_activity(tenant_id, department, timestamp DESC);

-- Create role_permissions table for granular access control
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  department TEXT,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, department, role, module)
);

-- Enable RLS on role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only owners and managers can manage permissions
CREATE POLICY "permissions_manage" ON role_permissions
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- Indexes for role_permissions
CREATE INDEX idx_role_permissions_tenant ON role_permissions(tenant_id, department, role);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get department staff (for supervisors)
CREATE OR REPLACE FUNCTION get_department_staff(_user_id UUID, _tenant_id UUID)
RETURNS TABLE (
  staff_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  status TEXT,
  phone TEXT,
  branch TEXT
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.full_name, s.email, s.role, s.status, s.phone, s.branch
  FROM staff s
  JOIN staff supervisor ON supervisor.id = s.supervisor_id
  WHERE supervisor.user_id = _user_id
    AND s.tenant_id = _tenant_id
    AND s.status = 'active';
END;
$$;

-- Migrate existing users from user_roles to staff table
INSERT INTO staff (tenant_id, user_id, full_name, email, department, role, status)
SELECT 
  ur.tenant_id,
  ur.user_id,
  COALESCE(p.full_name, p.email),
  p.email,
  CASE ur.role::text
    WHEN 'frontdesk' THEN 'front_office'
    WHEN 'housekeeping' THEN 'housekeeping'
    WHEN 'maintenance' THEN 'maintenance'
    WHEN 'finance' THEN 'accounts'
    WHEN 'accountant' THEN 'accounts'
    WHEN 'restaurant' THEN 'food_beverage'
    WHEN 'bar' THEN 'food_beverage'
    WHEN 'owner' THEN 'management'
    WHEN 'manager' THEN 'management'
    WHEN 'supervisor' THEN 'management'
    ELSE 'management'
  END as department,
  ur.role::text,
  'active'
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM staff s WHERE s.user_id = ur.user_id AND s.tenant_id = ur.tenant_id
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;