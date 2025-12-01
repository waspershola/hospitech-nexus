-- GROUP-CHARGES-FIX-V1-MINIMAL: Update RPC only to show expected totals
-- Skip index creation due to existing duplicates (will handle separately)

DROP FUNCTION IF EXISTS get_group_master_folio(uuid, text);

CREATE FUNCTION get_group_master_folio(
  p_tenant_id UUID,
  p_group_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_master_folio JSON;
  v_child_folios JSON;
  v_aggregated_balances JSON;
  v_booking_count INTEGER;
  v_expected_total NUMERIC;
BEGIN
  -- Get master folio
  SELECT json_build_object(
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
    'created_at', sf.created_at
  )
  INTO v_master_folio
  FROM stay_folios sf
  WHERE sf.tenant_id = p_tenant_id
    AND sf.folio_type = 'group_master'
    AND sf.metadata->>'group_id' = p_group_id
  LIMIT 1;

  -- Get child folios with room and guest details
  SELECT json_agg(
    json_build_object(
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
      'booking', json_build_object(
        'booking_reference', b.booking_reference,
        'check_in', b.check_in,
        'check_out', b.check_out
      ),
      'guest', json_build_object(
        'name', g.name,
        'email', g.email,
        'phone', g.phone
      ),
      'room', json_build_object(
        'number', r.number
      )
    )
  )
  INTO v_child_folios
  FROM stay_folios sf
  LEFT JOIN bookings b ON b.id = sf.booking_id
  LEFT JOIN guests g ON g.id = sf.guest_id
  LEFT JOIN rooms r ON r.id = sf.room_id
  WHERE sf.tenant_id = p_tenant_id
    AND sf.folio_type = 'room'
    AND b.metadata->>'group_id' = p_group_id;

  -- Get aggregated balances from child folios
  SELECT json_build_object(
    'total_charges', COALESCE(SUM(sf.total_charges), 0),
    'total_payments', COALESCE(SUM(sf.total_payments), 0),
    'outstanding_balance', COALESCE(SUM(sf.balance), 0),
    'children_breakdown', json_agg(
      json_build_object(
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
  )
  INTO v_aggregated_balances
  FROM stay_folios sf
  LEFT JOIN bookings b ON b.id = sf.booking_id
  LEFT JOIN guests g ON g.id = sf.guest_id
  LEFT JOIN rooms r ON r.id = sf.room_id
  WHERE sf.tenant_id = p_tenant_id
    AND sf.folio_type = 'room'
    AND b.metadata->>'group_id' = p_group_id;

  -- Get expected totals from bookings (NEW: shows ₦141,900 instead of ₦0)
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(total_amount), 0)
  INTO v_booking_count, v_expected_total
  FROM bookings
  WHERE tenant_id = p_tenant_id
    AND metadata->>'group_id' = p_group_id
    AND status NOT IN ('cancelled', 'completed');

  -- Return combined result with expected totals
  RETURN json_build_object(
    'master_folio', v_master_folio,
    'child_folios', COALESCE(v_child_folios, '[]'::json),
    'aggregated_balances', v_aggregated_balances,
    'expected_totals', json_build_object(
      'room_count', v_booking_count,
      'expected_total', v_expected_total
    )
  );
END;
$$;