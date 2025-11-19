-- Migration: Create Folio Routing Rules Table
-- Version: MULTI-FOLIO-V1

CREATE TABLE IF NOT EXISTS folio_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  charge_category TEXT NOT NULL,
  target_folio_type TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  auto_create_folio BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT folio_routing_rules_folio_type_check 
    CHECK (target_folio_type IN ('room', 'incidentals', 'corporate', 'group', 'mini_bar', 'spa', 'restaurant'))
);

CREATE INDEX idx_folio_routing_tenant_category 
ON folio_routing_rules(tenant_id, charge_category, is_active);

CREATE INDEX idx_folio_routing_priority 
ON folio_routing_rules(tenant_id, priority) 
WHERE is_active = TRUE;

CREATE INDEX idx_folio_routing_organization 
ON folio_routing_rules(organization_id) 
WHERE organization_id IS NOT NULL;

ALTER TABLE folio_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view routing rules for their tenant"
ON folio_routing_rules FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage routing rules"
ON folio_routing_rules FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'manager')
  )
);

CREATE TRIGGER update_folio_routing_rules_updated_at
  BEFORE UPDATE ON folio_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();