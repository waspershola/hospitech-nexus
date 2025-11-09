-- Backfill staff records for existing owners who don't have staff records
-- This ensures all owners can see full navigation with management department access

INSERT INTO staff (
  user_id,
  tenant_id,
  full_name,
  email,
  phone,
  department,
  role,
  status
)
SELECT 
  ur.user_id,
  ur.tenant_id,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Owner'),
  au.email,
  au.phone,
  'management',
  'owner',
  'active'
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.user_id = ur.user_id 
      AND s.tenant_id = ur.tenant_id
  );