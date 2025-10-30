-- Create hotel_permissions table
CREATE TABLE hotel_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  permission_key text NOT NULL,
  allowed boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, role, permission_key)
);

-- Enable RLS
ALTER TABLE hotel_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners/Managers can manage permissions"
  ON hotel_permissions FOR ALL
  USING (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (has_role(auth.uid(), tenant_id, 'owner'::app_role) 
      OR has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

CREATE POLICY "Users can view tenant permissions"
  ON hotel_permissions FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_hotel_permissions_updated_at
  BEFORE UPDATE ON hotel_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Audit log trigger
CREATE TRIGGER log_permissions_changes
  AFTER INSERT OR UPDATE OR DELETE ON hotel_permissions
  FOR EACH ROW
  EXECUTE FUNCTION log_config_change();

-- Create hotel_config_snapshots table for versioning
CREATE TABLE hotel_config_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  snapshot_data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  label text,
  notes text
);

-- Enable RLS
ALTER TABLE hotel_config_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners/Managers can manage snapshots"
  ON hotel_config_snapshots FOR ALL
  USING (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (has_role(auth.uid(), tenant_id, 'owner'::app_role) 
      OR has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );