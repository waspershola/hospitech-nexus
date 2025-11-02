-- PHASE 2 & 3: Database-driven navigation and room assignments

-- Create navigation table
CREATE TABLE IF NOT EXISTS navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT NOT NULL,
  allowed_roles app_role[] NOT NULL,
  parent_id UUID REFERENCES navigation_items(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant nav items"
ON navigation_items FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Owners can manage nav items"
ON navigation_items FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) 
  AND has_role(auth.uid(), tenant_id, 'owner')
);

-- Trigger for updated_at
CREATE TRIGGER update_navigation_items_updated_at
BEFORE UPDATE ON navigation_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add room assignments
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_rooms_assigned_to ON rooms(assigned_to);

-- Update room RLS policies
DROP POLICY IF EXISTS "Staff can manage rooms in their tenant" ON rooms;
DROP POLICY IF EXISTS "Users can view their tenant rooms" ON rooms;

CREATE POLICY "Role-based room access"
ON rooms FOR SELECT
USING (
  tenant_id = get_user_tenant(auth.uid())
  AND (
    has_role(auth.uid(), tenant_id, 'owner')
    OR has_role(auth.uid(), tenant_id, 'manager')
    OR has_role(auth.uid(), tenant_id, 'frontdesk')
    OR (
      has_role(auth.uid(), tenant_id, 'housekeeping')
      AND (
        assigned_to = auth.uid()
        OR status IN ('dirty', 'cleaning')
      )
    )
    OR (
      has_role(auth.uid(), tenant_id, 'maintenance')
      AND status IN ('maintenance', 'out_of_order')
    )
  )
);

CREATE POLICY "Staff can manage rooms based on role"
ON rooms FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid())
  AND (
    has_role(auth.uid(), tenant_id, 'owner')
    OR has_role(auth.uid(), tenant_id, 'manager')
    OR has_role(auth.uid(), tenant_id, 'frontdesk')
  )
);

-- Permission helper function
CREATE OR REPLACE FUNCTION user_has_permission(
  _user_id UUID,
  _tenant_id UUID,
  _permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hotel_permissions hp
    JOIN user_roles ur ON ur.role = hp.role AND ur.tenant_id = hp.tenant_id
    WHERE ur.user_id = _user_id
      AND hp.tenant_id = _tenant_id
      AND hp.permission_key = _permission_key
      AND hp.allowed = true
  )
$$;