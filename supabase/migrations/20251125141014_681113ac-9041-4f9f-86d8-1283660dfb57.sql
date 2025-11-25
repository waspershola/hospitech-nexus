-- Fix Tenant Navigation - Remove Recursive Finance Center Child
-- Version: NAV-TENANT-FIX-V1
-- IMPORTANT: This migration ONLY touches tenant navigation items, NOT platform admin items

-- Issue: Finance Center appears as both parent AND child of itself (recursive structure)
-- Fix: Remove the child Finance Center entry that points to parent Finance Center

-- Step 1: Remove recursive Finance Center child entry
DELETE FROM platform_nav_items
WHERE tenant_id IS NULL
  AND path = '#finance-center'
  AND parent_id IS NOT NULL
  AND parent_id = (
    SELECT id FROM platform_nav_items 
    WHERE tenant_id IS NULL 
      AND path = '#finance-center' 
      AND parent_id IS NULL
  );

-- Step 2: Rename "#finance-main" subgroup to "Overview & Dashboard" for clarity
UPDATE platform_nav_items
SET name = 'Overview & Dashboard'
WHERE tenant_id IS NULL
  AND path = '#finance-main'
  AND parent_id IS NOT NULL;

-- Verification query
DO $$
BEGIN
  RAISE NOTICE 'Tenant Navigation Fix Complete - NAV-TENANT-FIX-V1';
  RAISE NOTICE 'Removed recursive Finance Center child entry';
  RAISE NOTICE 'Renamed Finance Main subgroup to Overview & Dashboard';
  RAISE NOTICE 'Platform admin navigation items untouched';
END $$;