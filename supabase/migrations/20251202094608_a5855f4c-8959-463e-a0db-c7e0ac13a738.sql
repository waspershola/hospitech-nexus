-- GROUP-BOOKING-COMPREHENSIVE-FIX-V1: Phase 1 & 2
-- Phase 1: Fix "Total Rooms" count from bookings table (not child folios)

-- =====================================================
-- PHASE 1: Fix sync_master_folio_totals to calculate group_size from bookings
-- =====================================================

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
  v_booking_count INTEGER := 0;
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
      'version', 'GROUP-BOOKING-COMPREHENSIVE-FIX-V1'
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

  -- FIX: Calculate group_size from BOOKINGS table, not child folios
  -- This ensures "Total Rooms" shows correct count BEFORE check-in
  IF v_group_id IS NOT NULL THEN
    -- Get booking count from bookings table
    SELECT COUNT(*)::INTEGER
    INTO v_booking_count
    FROM bookings
    WHERE tenant_id = v_tenant_id
      AND metadata->>'group_id' = v_group_id
      AND status NOT IN ('cancelled', 'completed');

    -- Update group_bookings with booking count (not child folio count)
    UPDATE group_bookings
    SET 
      group_size = v_booking_count,
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
    'booking_count', v_booking_count,
    'group_size_updated', v_booking_count,
    'version', 'GROUP-BOOKING-COMPREHENSIVE-FIX-V1'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'version', 'GROUP-BOOKING-COMPREHENSIVE-FIX-V1'
    );
END;
$$;

COMMENT ON FUNCTION sync_master_folio_totals IS 'GROUP-BOOKING-COMPREHENSIVE-FIX-V1: Aggregates child folio totals to master folio AND updates group_bookings.group_size from bookings table';

-- =====================================================
-- Backfill group_size for existing group bookings
-- =====================================================

-- Update all existing group bookings to use booking count instead of child folio count
UPDATE group_bookings gb
SET group_size = (
  SELECT COUNT(*)
  FROM bookings b
  WHERE b.tenant_id = gb.tenant_id
    AND b.metadata->>'group_id' = gb.group_id::text
    AND b.status NOT IN ('cancelled', 'completed')
)
WHERE gb.group_id IS NOT NULL;

-- Verification query (will output in logs)
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM group_bookings
  WHERE group_size > 0;
  
  RAISE NOTICE '[GROUP-BOOKING-COMPREHENSIVE-FIX-V1] Updated % group bookings with correct group_size from bookings table', v_updated_count;
END $$;