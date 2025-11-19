-- Backfill missing group_bookings entry and master folio for failed group
-- VERSION: BACKFILL-GROUP-E32D5947-MASTER-FOLIO-V2

DO $$
DECLARE
  v_result jsonb;
BEGIN
  -- Insert missing group_bookings entry (idempotent)
  INSERT INTO group_bookings (
    id,
    tenant_id,
    group_id,
    group_name,
    group_size,
    master_booking_id,
    status,
    created_at
  )
  SELECT 
    gen_random_uuid(),
    '9ed914a4-5669-4abe-a96a-27ed9851f45a'::uuid,
    'e32d5947-84c9-4b01-ae5a-4c5af5b36d49'::uuid,
    'wedding',
    3,
    'cc3226f9-34b4-4387-8725-fadcd94e167e'::uuid, -- First booking as master
    'active',
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM group_bookings 
    WHERE group_id::text = 'e32d5947-84c9-4b01-ae5a-4c5af5b36d49'
  );

  -- Create master folio using the TEXT version (idempotent)
  SELECT create_group_master_folio(
    '9ed914a4-5669-4abe-a96a-27ed9851f45a'::uuid,
    'e32d5947-84c9-4b01-ae5a-4c5af5b36d49', -- TEXT parameter
    'cc3226f9-34b4-4387-8725-fadcd94e167e'::uuid,
    '34d4cfea-384c-479b-b5a2-d7c95428fe22'::uuid,
    'wedding'
  ) INTO v_result;

  RAISE NOTICE 'Backfill result: %', v_result;
END $$;