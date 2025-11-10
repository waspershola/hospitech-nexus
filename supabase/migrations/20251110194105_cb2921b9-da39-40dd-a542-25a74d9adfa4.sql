-- Phase 1: Database Schema Updates for Menu Approval & Department Routing

-- 1.1 Add approval fields to menu_items
ALTER TABLE menu_items 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Set existing items as approved (backward compatibility)
UPDATE menu_items 
SET status = 'approved', approved_at = NOW() 
WHERE status IS NULL OR status = 'approved';

-- 1.2 Add assigned_department to requests table
ALTER TABLE requests 
  ADD COLUMN IF NOT EXISTS assigned_department TEXT;

-- 1.3 Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_status ON menu_items(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_requests_department ON requests(assigned_department, tenant_id);

-- 1.4 Update RLS policy for guest portal to only see approved items
DROP POLICY IF EXISTS "Guests can view approved menu items" ON menu_items;

CREATE POLICY "Guests can view approved menu items"
ON menu_items FOR SELECT
USING (status = 'approved' AND is_available = true);