-- PHASE-3: Fix Group Booking Room Count & Folio Sync
-- This migration ensures group_bookings.group_size accurately reflects room count
-- and updates sync_master_folio_totals to also update group_size

-- PART 1: Enhance sync_master_folio_totals to update group_size
DROP FUNCTION IF EXISTS sync_master_folio_totals(UUID);

CREATE OR REPLACE FUNCTION sync_master_folio_totals(p_master_folio_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_total_charges NUMERIC := 0;
  v_total_payments NUMERIC := 0;
  v_balance NUMERIC := 0;
  v_child_count INTEGER := 0;
  v_group_id TEXT;
BEGIN
  -- Get tenant_id and group_id from master folio
  SELECT tenant_id, metadata->>'group_id'
  INTO v_tenant_id, v_group_id
  FROM stay_folios
  WHERE id = p_master_folio_id
    AND folio_type = 'group_master';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Master folio not found',
      'version', 'PHASE-3-GROUP-SIZE-SYNC'
    );
  END IF;

  -- Aggregate totals from all child folios
  SELECT 
    COALESCE(SUM(total_charges), 0),
    COALESCE(SUM(total_payments), 0),
    COALESCE(SUM(balance), 0),
    COUNT(*)
  INTO v_total_charges, v_total_payments, v_balance, v_child_count
  FROM stay_folios
  WHERE parent_folio_id = p_master_folio_id
    AND tenant_id = v_tenant_id
    AND status = 'open';

  -- Update master folio with aggregated totals
  UPDATE stay_folios
  SET 
    total_charges = v_total_charges,
    total_payments = v_total_payments,
    balance = v_balance,
    updated_at = NOW()
  WHERE id = p_master_folio_id
    AND tenant_id = v_tenant_id;

  -- PHASE-3: Update group_bookings.group_size to reflect actual room count
  IF v_group_id IS NOT NULL THEN
    UPDATE group_bookings
    SET 
      group_size = v_child_count,
      updated_at = NOW()
    WHERE group_id = v_group_id::uuid
      AND tenant_id = v_tenant_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'master_folio_id', p_master_folio_id,
    'total_charges', v_total_charges,
    'total_payments', v_total_payments,
    'balance', v_balance,
    'child_count', v_child_count,
    'group_size_updated', v_child_count,
    'version', 'PHASE-3-GROUP-SIZE-SYNC'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'version', 'PHASE-3-GROUP-SIZE-SYNC'
    );
END;
$$;

COMMENT ON FUNCTION sync_master_folio_totals IS 'PHASE-3: Aggregates child folio totals to master folio AND updates group_bookings.group_size';

-- PART 2: Backfill group_size for existing group bookings
UPDATE group_bookings gb
SET group_size = (
  SELECT COUNT(*)
  FROM stay_folios sf
  WHERE sf.parent_folio_id = gb.master_folio_id
    AND sf.tenant_id = gb.tenant_id
    AND sf.status = 'open'
    AND sf.folio_type = 'room'
)
WHERE gb.master_folio_id IS NOT NULL;