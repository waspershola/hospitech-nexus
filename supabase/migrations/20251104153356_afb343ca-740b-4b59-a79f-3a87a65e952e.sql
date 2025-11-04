-- Phase 1: Add department filtering capabilities to navigation_items

-- Add allowed_departments column for department-based filtering
ALTER TABLE navigation_items 
ADD COLUMN allowed_departments TEXT[] DEFAULT '{}';

-- Add metadata column for future extensibility (badges, permissions, visibility rules)
ALTER TABLE navigation_items 
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Add description column for admin UI documentation
ALTER TABLE navigation_items 
ADD COLUMN description TEXT;

-- Create index for fast filtering by tenant and active status
CREATE INDEX idx_navigation_tenant_role_dept 
ON navigation_items (tenant_id, is_active) 
WHERE is_active = true;

-- Add unique constraint to prevent duplicate paths per tenant
ALTER TABLE navigation_items 
ADD CONSTRAINT unique_tenant_path 
UNIQUE (tenant_id, path);

-- Add comment explaining the allowed_departments logic
COMMENT ON COLUMN navigation_items.allowed_departments IS 
'Empty array means visible to all departments. Specific departments restrict visibility to only those departments.';

COMMENT ON COLUMN navigation_items.metadata IS 
'Extensible JSONB field for badges, custom permissions, visibility rules, and future features.';