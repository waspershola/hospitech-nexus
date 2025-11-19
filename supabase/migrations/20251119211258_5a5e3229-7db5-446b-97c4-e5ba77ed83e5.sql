-- Drop old UUID version to resolve function overloading conflict
-- VERSION: GROUP-MASTER-V1.2-DROP-UUID-VERSION

DROP FUNCTION IF EXISTS public.create_group_master_folio(
  p_tenant_id uuid,
  p_group_id uuid,
  p_master_booking_id uuid,
  p_guest_id uuid,
  p_group_name text
);