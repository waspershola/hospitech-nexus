-- Phase 1: Add preferred_staff_language to tenants table
-- This enables tenant-specific staff language for AI translation

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS preferred_staff_language TEXT NOT NULL DEFAULT 'en';

COMMENT ON COLUMN tenants.preferred_staff_language IS 'Staff language for AI translation (ISO code like en, ar, de, fr). Guest messages will be translated to this language for staff, and staff replies will be translated from this language to guest language.';

-- Verify guest_communications has all required AI columns
DO $$ 
BEGIN
  -- Add target_language if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'guest_communications' AND column_name = 'target_language'
  ) THEN
    ALTER TABLE guest_communications ADD COLUMN target_language TEXT;
  END IF;
END $$;