-- Migration: Create post_group_master_charge_direct function (GROUP-MASTER-V5.1-DIRECT)
-- Purpose: Bypass all nested RPC calls to eliminate UUID serialization issues
-- Performs all operations (find folio, insert charge, update balance) in single atomic function

CREATE OR REPLACE FUNCTION post_group_master_charge_direct(
  p_tenant_id UUID,
  p_group_id TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio_id UUID;
  v_folio_tenant_id UUID;
  v_transaction_id UUID;
  v_new_total_charges NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Find AND LOCK master folio for this group
  SELECT id, tenant_id INTO v_folio_id, v_folio_tenant_id
  FROM stay_folios
  WHERE tenant_id = p_tenant_id
    AND folio_type = 'group_master'
    AND metadata->>'group_id' = p_group_id
    AND status = 'open'
  FOR UPDATE
  LIMIT 1;
  
  -- Return error if master folio not found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Master folio not found for group',
      'group_id', p_group_id
    );
  END IF;
  
  -- Insert charge transaction DIRECTLY (no nested RPC call)
  INSERT INTO folio_transactions (
    tenant_id,
    folio_id,
    transaction_type,
    amount,
    description,
    reference_type,
    reference_id,
    department,
    created_by,
    created_at
  ) VALUES (
    v_folio_tenant_id,
    v_folio_id,
    'charge',
    p_amount,
    p_description,
    p_reference_type,
    p_reference_id,
    'front_desk',
    auth.uid(),
    NOW()
  ) RETURNING id INTO v_transaction_id;
  
  -- Update folio balances DIRECTLY (no nested RPC call)
  UPDATE stay_folios
  SET 
    total_charges = total_charges + p_amount,
    balance = balance + p_amount,
    updated_at = NOW()
  WHERE id = v_folio_id
  RETURNING total_charges, balance INTO v_new_total_charges, v_new_balance;
  
  -- Return success with full details
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'folio_id', v_folio_id,
    'amount', p_amount,
    'new_total_charges', v_new_total_charges,
    'new_balance', v_new_balance,
    'marker', 'GROUP-MASTER-V5.1-DIRECT'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return detailed error information
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'group_id', p_group_id,
      'amount', p_amount
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION post_group_master_charge_direct TO authenticated;

COMMENT ON FUNCTION post_group_master_charge_direct IS 
  'GROUP-MASTER-V5.1-DIRECT: Direct charge posting to group master folio without nested RPC calls. Eliminates UUID serialization issues by performing all operations in single atomic function.';