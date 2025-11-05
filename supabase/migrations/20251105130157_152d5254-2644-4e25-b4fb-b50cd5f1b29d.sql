-- Phase 1 & 2 & 5: Database Schema Enhancement + Trigger-based Protection + Bootstrap Super Admin

-- Add system_locked column to platform_users
ALTER TABLE platform_users 
ADD COLUMN IF NOT EXISTS system_locked BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_platform_users_system_locked 
ON platform_users(system_locked) WHERE system_locked = TRUE;

-- Create database function to check system_locked status
CREATE OR REPLACE FUNCTION public.is_system_locked_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT system_locked FROM platform_users WHERE id = _user_id),
    FALSE
  );
$$;

-- Create trigger function to protect system-locked users
CREATE OR REPLACE FUNCTION public.protect_system_locked_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent deletion of system-locked users
  IF TG_OP = 'DELETE' THEN
    IF OLD.system_locked = TRUE THEN
      RAISE EXCEPTION 'Cannot delete system-locked user. This is a protected platform account.';
    END IF;
    RETURN OLD;
  END IF;

  -- Prevent unlocking or role changes for system-locked users
  IF TG_OP = 'UPDATE' THEN
    IF OLD.system_locked = TRUE THEN
      -- Prevent changing system_locked to false
      IF NEW.system_locked = FALSE THEN
        RAISE EXCEPTION 'Cannot remove system_locked flag from protected user';
      END IF;
      -- Prevent changing role
      IF NEW.role != OLD.role THEN
        RAISE EXCEPTION 'Cannot change role of system-locked user';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS protect_system_locked_users_trigger ON platform_users;

-- Create trigger for system-locked user protection
CREATE TRIGGER protect_system_locked_users_trigger
  BEFORE UPDATE OR DELETE ON platform_users
  FOR EACH ROW
  EXECUTE FUNCTION protect_system_locked_users();

-- Bootstrap Super Admin Account
INSERT INTO platform_users (
  id,
  email,
  name,
  role,
  system_locked,
  metadata,
  created_at,
  updated_at
)
VALUES (
  '5457d071-25df-4ca9-aa7a-7ff706b60b0c',
  'wasperstore@gmail.com',
  'Super Admin',
  'super_admin',
  TRUE,
  jsonb_build_object(
    'system_locked', true,
    'created_by', 'system',
    'description', 'Platform root administrator - undeletable',
    'last_modified', NULL
  ),
  NOW(),
  NOW()
)
ON CONFLICT (id) 
DO UPDATE SET
  role = 'super_admin',
  system_locked = TRUE,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Log the bootstrap action
INSERT INTO platform_audit_stream (
  actor_id,
  actor_role,
  action,
  resource_type,
  resource_id,
  payload
)
VALUES (
  '5457d071-25df-4ca9-aa7a-7ff706b60b0c',
  'super_admin',
  'system_account_initialized',
  'platform_user',
  '5457d071-25df-4ca9-aa7a-7ff706b60b0c',
  jsonb_build_object(
    'type', 'super_admin_bootstrap',
    'locked', true,
    'timestamp', NOW()
  )
);