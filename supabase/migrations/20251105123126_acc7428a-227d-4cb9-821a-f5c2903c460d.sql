-- Drop table if exists to start fresh
DROP TABLE IF EXISTS platform_navigation_items CASCADE;

-- Create platform_navigation_items table
CREATE TABLE platform_navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES platform_navigation_items(id) ON DELETE CASCADE,
  allowed_roles TEXT[] DEFAULT '{}',
  order_index INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(path, tenant_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_nav_items_tenant ON platform_navigation_items(tenant_id);
CREATE INDEX idx_nav_items_parent ON platform_navigation_items(parent_id);
CREATE INDEX idx_nav_items_active ON platform_navigation_items(is_active) WHERE is_active = true;
CREATE INDEX idx_nav_items_order ON platform_navigation_items(order_index);

-- Trigger for updated_at
CREATE TRIGGER update_nav_items_updated_at
  BEFORE UPDATE ON platform_navigation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

-- Enable RLS
ALTER TABLE platform_navigation_items ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all navigation
CREATE POLICY "Platform admins manage navigation"
  ON platform_navigation_items
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()));

-- Users can view active navigation for their tenant or global
CREATE POLICY "Users view navigation"
  ON platform_navigation_items
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      tenant_id IS NULL
      OR tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
    )
  );