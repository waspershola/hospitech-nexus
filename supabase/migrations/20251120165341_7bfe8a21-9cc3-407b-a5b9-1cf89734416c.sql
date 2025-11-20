-- Create wrapper RPC for group master folio charge posting
-- This eliminates JS client UUID serialization issues by handling UUID resolution in PostgreSQL
-- Version: POST-GROUP-MASTER-CHARGE-V1

CREATE OR REPLACE FUNCTION post_group_master_charge(
  p_tenant_id UUID,
  p_group_id TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_folio_id UUID;
  v_result JSONB;
BEGIN
  -- Find master folio for this group
  SELECT id INTO v_folio_id
  FROM stay_folios
  WHERE tenant_id = p_tenant_id
    AND folio_type = 'group_master'
    AND metadata->>'group_id' = p_group_id
    AND status = 'open'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Master folio not found for group',
      'tenant_id', p_tenant_id,
      'group_id', p_group_id
    );
  END IF;
  
  -- Call folio_post_charge with guaranteed clean UUID
  SELECT folio_post_charge(
    v_folio_id,
    p_amount,
    p_description,
    p_reference_type,
    p_reference_id,
    'front_desk'
  ) INTO v_result;
  
  -- Add folio_id to result for debugging
  v_result := v_result || jsonb_build_object('folio_id', v_folio_id);
  
  RETURN v_result;
END;
$$;