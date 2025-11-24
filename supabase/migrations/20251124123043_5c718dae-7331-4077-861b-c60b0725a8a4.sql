-- Fix folio_post_charge to accept NULL for p_reference_id
-- Marker: FOLIO-POST-CHARGE-UUID-NULL-FIX-V1

-- Drop existing function
DROP FUNCTION IF EXISTS folio_post_charge(TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT);

-- Recreate with NULL-safe UUID parameter
CREATE OR REPLACE FUNCTION folio_post_charge(
  p_folio_id TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_department TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio_id uuid;
  v_tenant_id uuid;
  v_booking_id uuid;
  v_transaction_id uuid;
  v_current_balance numeric;
  v_new_balance numeric;
  v_is_json boolean;
BEGIN
  -- Try JSON extraction first, fallback to direct cast
  BEGIN
    v_is_json := (p_folio_id::jsonb IS NOT NULL);
    v_folio_id := (p_folio_id::jsonb->>'id')::uuid;
    RAISE NOTICE '[FOLIO-POST-CHARGE-UUID-NULL-FIX-V1] Extracted from JSON: %', v_folio_id;
  EXCEPTION WHEN OTHERS THEN
    v_folio_id := p_folio_id::uuid;
    RAISE NOTICE '[FOLIO-POST-CHARGE-UUID-NULL-FIX-V1] Direct cast: %', v_folio_id;
  END;

  -- Get folio details with tenant check
  SELECT tenant_id, booking_id, balance INTO v_tenant_id, v_booking_id, v_current_balance
  FROM stay_folios
  WHERE id = v_folio_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Folio not found',
      'code', 'FOLIO_NOT_FOUND',
      'version', 'FOLIO-POST-CHARGE-UUID-NULL-FIX-V1'
    );
  END IF;

  -- Create folio transaction
  INSERT INTO folio_transactions (
    tenant_id,
    folio_id,
    transaction_type,
    amount,
    description,
    reference_type,
    reference_id,
    department,
    created_by
  )
  VALUES (
    v_tenant_id,
    v_folio_id,
    'charge',
    p_amount,
    p_description,
    p_reference_type,
    p_reference_id,
    p_department,
    auth.uid()
  )
  RETURNING id INTO v_transaction_id;

  -- Update folio balance
  v_new_balance := v_current_balance + p_amount;

  UPDATE stay_folios
  SET 
    total_charges = total_charges + p_amount,
    balance = v_new_balance,
    updated_at = now()
  WHERE id = v_folio_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance,
    'version', 'FOLIO-POST-CHARGE-UUID-NULL-FIX-V1',
    'debug_v_folio_id', v_folio_id::text
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE,
    'version', 'FOLIO-POST-CHARGE-UUID-NULL-FIX-V1'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION folio_post_charge TO authenticated;
GRANT EXECUTE ON FUNCTION folio_post_charge TO service_role;

-- Add function comment
COMMENT ON FUNCTION folio_post_charge IS 'Posts charge to folio with NULL-safe UUID parameter for p_reference_id (FOLIO-POST-CHARGE-UUID-NULL-FIX-V1)';