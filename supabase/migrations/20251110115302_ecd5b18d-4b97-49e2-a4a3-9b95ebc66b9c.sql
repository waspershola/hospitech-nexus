-- Phase 1: Critical Database Fixes

-- Add display_order column to wifi_credentials
ALTER TABLE wifi_credentials
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Update existing records to have sequential display_order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) as rn
  FROM wifi_credentials
)
UPDATE wifi_credentials
SET display_order = numbered.rn - 1
FROM numbered
WHERE wifi_credentials.id = numbered.id;

-- Add parent_id to platform_nav_items for hierarchical navigation
ALTER TABLE platform_nav_items
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES platform_nav_items(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_platform_nav_items_parent_id ON platform_nav_items(parent_id);