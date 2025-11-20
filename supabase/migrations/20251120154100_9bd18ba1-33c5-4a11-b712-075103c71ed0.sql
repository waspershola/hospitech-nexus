-- Phase 1: Drop duplicate get_group_master_folio RPC to fix PGRST203 error
-- GROUP-MASTER-V4-RPC-FIX
-- This migration ensures only ONE version of get_group_master_folio exists (TEXT parameter)

-- Drop ALL versions of get_group_master_folio to clean slate
DROP FUNCTION IF EXISTS get_group_master_folio(uuid, uuid);
DROP FUNCTION IF EXISTS get_group_master_folio(uuid, text);

-- Recreate the correct TEXT-only version
CREATE OR REPLACE FUNCTION get_group_master_folio(
  p_tenant_id UUID,
  p_group_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_master_folio RECORD;
  v_child_folios JSONB;
  v_aggregated JSONB;
BEGIN
  -- Get master folio
  SELECT * INTO v_master_folio
  FROM stay_folios
  WHERE tenant_id = p_tenant_id
    AND folio_type = 'group_master'
    AND metadata->>'group_id' = p_group_id
    AND status = 'open';

  -- Get all child folios
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sf.id,
      'folio_number', sf.folio_number,
      'folio_type', sf.folio_type,
      'booking_id', sf.booking_id,
      'guest_id', sf.guest_id,
      'room_id', sf.room_id,
      'total_charges', sf.total_charges,
      'total_payments', sf.total_payments,
      'balance', sf.balance,
      'status', sf.status,
      'created_at', sf.created_at,
      'booking', jsonb_build_object(
        'booking_reference', b.booking_reference,
        'check_in', b.check_in,
        'check_out', b.check_out
      ),
      'guest', jsonb_build_object(
        'name', g.name,
        'email', g.email,
        'phone', g.phone
      ),
      'room', jsonb_build_object(
        'number', r.number
      )
    )
  ) INTO v_child_folios
  FROM stay_folios sf
  LEFT JOIN bookings b ON b.id = sf.booking_id
  LEFT JOIN guests g ON g.id = sf.guest_id
  LEFT JOIN rooms r ON r.id = sf.room_id
  WHERE sf.tenant_id = p_tenant_id
    AND sf.folio_type = 'room'
    AND b.metadata->>'group_id' = p_group_id;

  -- Calculate aggregated balances
  SELECT jsonb_build_object(
    'total_charges', COALESCE(SUM(total_charges), 0),
    'total_payments', COALESCE(SUM(total_payments), 0),
    'outstanding_balance', COALESCE(SUM(balance), 0),
    'children_breakdown', jsonb_agg(
      jsonb_build_object(
        'folio_id', sf.id,
        'folio_number', sf.folio_number,
        'folio_type', sf.folio_type,
        'room_number', r.number,
        'guest_name', g.name,
        'charges', sf.total_charges,
        'payments', sf.total_payments,
        'balance', sf.balance
      )
    )
  ) INTO v_aggregated
  FROM stay_folios sf
  LEFT JOIN bookings b ON b.id = sf.booking_id
  LEFT JOIN guests g ON g.id = sf.guest_id
  LEFT JOIN rooms r ON r.id = sf.room_id
  WHERE sf.tenant_id = p_tenant_id
    AND sf.folio_type = 'room'
    AND b.metadata->>'group_id' = p_group_id;

  -- Build result
  v_result := jsonb_build_object(
    'master_folio', CASE 
      WHEN v_master_folio.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_master_folio.id,
          'folio_number', v_master_folio.folio_number,
          'folio_type', v_master_folio.folio_type,
          'booking_id', v_master_folio.booking_id,
          'guest_id', v_master_folio.guest_id,
          'room_id', v_master_folio.room_id,
          'total_charges', v_master_folio.total_charges,
          'total_payments', v_master_folio.total_payments,
          'balance', v_master_folio.balance,
          'status', v_master_folio.status,
          'created_at', v_master_folio.created_at
        )
      ELSE NULL
    END,
    'child_folios', COALESCE(v_child_folios, '[]'::jsonb),
    'aggregated_balances', COALESCE(v_aggregated, jsonb_build_object(
      'total_charges', 0,
      'total_payments', 0,
      'outstanding_balance', 0,
      'children_breakdown', '[]'::jsonb
    ))
  );

  RETURN v_result;
END;
$$;

-- Verify only ONE version exists
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE proname = 'get_group_master_folio';
  
  IF v_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 get_group_master_folio function, found %', v_count;
  END IF;
  
  RAISE NOTICE '[GROUP-MASTER-V4-RPC-FIX] Successfully verified: only 1 get_group_master_folio function exists';
END $$;

-- Add helpful comment
COMMENT ON FUNCTION get_group_master_folio(uuid, text) IS 
  'GROUP-MASTER-V4-RPC-FIX: Fetches group master folio with child folios and aggregated balances. Only TEXT group_id accepted to prevent PGRST203 overloading errors.';